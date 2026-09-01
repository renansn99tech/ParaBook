# api/views.py
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from biblioteca.models import Livro, Categoria, Biblioteca, SolicitacaoPublicacao, DeclaracaoAutoria
from biblioteca.services import verificar_acesso_obra
from assinaturas.utils import usuario_eh_premium
from .serializers import (
    LivroSerializer, CategoriaSerializer, EstanteSerializer, ResenhaSerializer,
    SolicitacaoPublicacaoSerializer,
)
from django.http import FileResponse
from usuarios.api.throttles import UploadRateThrottle
from django.conf import settings
from django.utils.crypto import salted_hmac
from django.utils import timezone
from usuarios.audit import registrar_acao

class CategoriaViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Categoria.objects.all()
    serializer_class = CategoriaSerializer
    permission_classes = [permissions.AllowAny]

class IsAdminOrReadOnly(permissions.BasePermission):
    """Catálogo público para leitura; escrita direta somente pela moderação."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_staff or request.user.is_superuser)
        )


class LivroViewSet(viewsets.ModelViewSet):
    serializer_class = LivroSerializer
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [filters.SearchFilter]
    search_fields = ['titulo', 'autor', 'territorio_cultural']

    def get_queryset(self):
        qs = Livro.objects.exclude(status='removido').select_related('categoria')
        user = self.request.user

        origem = self.request.query_params.get('origem')
        modelo_acesso = self.request.query_params.get('modelo_acesso')
        categoria = self.request.query_params.get('categoria')
        if origem:
            qs = qs.filter(origem=origem)
        if modelo_acesso:
            qs = qs.filter(modelo_acesso=modelo_acesso)
        if categoria:
            qs = qs.filter(categoria_id=categoria)
        
        if not user.is_authenticated:
            return qs.filter(status='publicado')
            
        # RBAC adaptado para os campos nativos do User e Perfil do Parabook
        if user.is_staff or user.is_superuser:
            return qs

        # Verifica se o usuário é autor via username/nome do perfil
        autor_nome = user.username
        if hasattr(user, 'perfil_da_biblioteca'):
            # Permite visualizar livros publicados ou criados pelo próprio autor
            return qs.filter(Q(status='publicado') | Q(autor__icontains=autor_nome))
            
        return qs.filter(status='publicado')

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def resenhas(self, request, pk=None):
        livro = self.get_object()
        resenhas = Biblioteca.objects.select_related(
            'user', 'user__perfil_customizado', 'user__perfil',
        ).filter(
            livro=livro
        ).exclude(nota__isnull=True, resenha__isnull=True).exclude(resenha='')
        serializer = ResenhaSerializer(resenhas, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def ler_pdf(self, request, pk=None):
        livro = self.get_object()
        decisao = verificar_acesso_obra(request.user, livro)
        if not decisao.pode_ler:
            return Response(
                {"detail": decisao.mensagem, "codigo": decisao.codigo, "acesso": decisao.para_api()},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not livro.pdf:
            return Response({"detail": "PDF não encontrado para este livro."}, status=status.HTTP_404_NOT_FOUND)
        
        try:
            return FileResponse(livro.pdf.open('rb'), content_type='application/pdf')
        except Exception:
            logger.exception('Falha ao abrir PDF do livro %s', livro.pk)
            return Response(
                {"detail": "Não foi possível abrir este livro."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=['get'], permission_classes=[permissions.AllowAny])
    def ler_amostra(self, request, pk=None):
        livro = self.get_object()
        decisao = verificar_acesso_obra(request.user, livro)
        if not decisao.pode_ler_amostra:
            return Response(
                {"detail": "Esta obra não possui uma amostra disponível.", "codigo": "amostra_indisponivel"},
                status=status.HTTP_404_NOT_FOUND,
            )
        try:
            return FileResponse(livro.pdf_amostra.open('rb'), content_type='application/pdf')
        except Exception:
            logger.exception('Falha ao abrir a amostra do livro %s', livro.pk)
            return Response(
                {"detail": "Não foi possível abrir a amostra desta obra."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

from django.db import transaction
from gamificacao.services import GamificacaoService
import logging

logger = logging.getLogger(__name__)

class EstanteViewSet(viewsets.ModelViewSet):
    serializer_class = EstanteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = Biblioteca.objects.filter(user=self.request.user).order_by('-data_adicao')
        status_filtro = self.request.query_params.get('status')
        livro_id = self.request.query_params.get('livro')

        if status_filtro:
            queryset = queryset.filter(status=status_filtro)

        if livro_id:
            queryset = queryset.filter(livro_id=livro_id)

        return queryset

    def create(self, request, *args, **kwargs):
        # 1. Checagem de Limite de Assinatura
        limite_livros = 10
        is_ilimitado = False

        if hasattr(request.user, 'assinatura') and request.user.assinatura.ativa and request.user.assinatura.plano:
            plano = request.user.assinatura.plano
            if plano.limite_livros == 0:
                is_ilimitado = True
            else:
                limite_livros = plano.limite_livros

        with transaction.atomic():
            request.user.__class__.objects.select_for_update().get(pk=request.user.pk)
            total_atual = Biblioteca.objects.filter(user=request.user).count()

            if not is_ilimitado and total_atual >= limite_livros:
                return Response(
                    {'detail': f"Você atingiu o limite de {limite_livros} livros do seu plano atual."}, 
                    status=status.HTTP_403_FORBIDDEN
                )

            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)

            # 2. Gatilho de Gamificação (Adição à Biblioteca)
            obj = serializer.instance
            msg_extra = []
            if not obj.xp_ganho_adicao:
                obj.xp_ganho_adicao = True
                obj.save(update_fields=['xp_ganho_adicao'])
                try:
                    res_xp = GamificacaoService.adicionar_xp(request.user, 10)
                    if res_xp and res_xp.get('subiu_nivel'):
                        msg_extra.append(f"Você subiu para o Nível {res_xp['nivel_atual']}!")
                except Exception as e:
                    logger.error(f"Erro na gamificação (adicionar): {str(e)}")

            headers = self.get_success_headers(serializer.data)
            response_data = serializer.data
            if msg_extra:
                response_data['gamificacao_alerts'] = msg_extra

            return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        extras = {'user': self.request.user}
        if serializer.validated_data.get('pagina_atual', 0) > 0:
            extras['ultima_leitura_em'] = timezone.now()
        if serializer.validated_data.get('status') == 'lido':
            extras['data_conclusao'] = timezone.now()
        if serializer.validated_data.get('nota') is not None or serializer.validated_data.get('resenha'):
            extras['avaliada_em'] = timezone.now()
        if serializer.validated_data.get('favorito'):
            extras['favoritado_em'] = timezone.now()
        serializer.save(**extras)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        # Armazena estado anterior para comparar após o update
        status_anterior = instance.status
        nota_anterior = instance.nota
        estava_favoritado = instance.favorito
        ja_tinha_resenha = bool(instance.resenha)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        if getattr(instance, '_prefetched_objects_cache', None):
            instance._prefetched_objects_cache = {}

        # 3. Gatilhos de Gamificação após atualização
        obj = serializer.instance
        campos_temporais = []
        if 'pagina_atual' in serializer.validated_data:
            obj.ultima_leitura_em = timezone.now()
            campos_temporais.append('ultima_leitura_em')
            if obj.status == 'quero_ler':
                obj.status = 'lendo'
                campos_temporais.append('status')
        if status_anterior != 'lido' and obj.status == 'lido':
            obj.data_conclusao = timezone.now()
            campos_temporais.append('data_conclusao')
        if 'nota' in serializer.validated_data or 'resenha' in serializer.validated_data:
            obj.avaliada_em = timezone.now() if obj.nota is not None or obj.resenha else None
            campos_temporais.append('avaliada_em')
        if not estava_favoritado and obj.favorito:
            obj.favoritado_em = timezone.now()
            campos_temporais.append('favoritado_em')
        if campos_temporais:
            obj.save(update_fields=campos_temporais)
        msg_extra = []

        try:
            # A. Iniciou Leitura
            if status_anterior != 'lendo' and obj.status == 'lendo':
                GamificacaoService.atualizar_streak(request.user)

            # B. Concluiu Leitura
            if status_anterior != 'lido' and obj.status == 'lido':
                if not obj.xp_ganho_leitura:
                    obj.xp_ganho_leitura = True
                    obj.save(update_fields=['xp_ganho_leitura'])
                    GamificacaoService.atualizar_streak(request.user)
                    res_xp = GamificacaoService.adicionar_xp(request.user, 100)
                    conquista = GamificacaoService.conceder_conquista(request.user, 'primeira_leitura_concluida')
                    if res_xp and res_xp.get('subiu_nivel'):
                        msg_extra.append(f"Subiu para Nível {res_xp['nivel_atual']}!")
                    if conquista:
                        msg_extra.append(f"Conquista desbloqueada: {conquista.nome}!")

            # C. Avaliação (Nota)
            if nota_anterior is None and obj.nota is not None:
                if not obj.xp_ganho_avaliacao:
                    obj.xp_ganho_avaliacao = True
                    obj.save(update_fields=['xp_ganho_avaliacao'])
                    GamificacaoService.adicionar_xp(request.user, 30)
                    GamificacaoService.conceder_conquista(request.user, 'primeira_avaliacao')

            # D. Resenha
            if not ja_tinha_resenha and bool(obj.resenha):
                if not obj.xp_ganho_resenha:
                    obj.xp_ganho_resenha = True
                    obj.save(update_fields=['xp_ganho_resenha'])
                    res_xp = GamificacaoService.adicionar_xp(request.user, 50)
                    if res_xp and res_xp.get('subiu_nivel'):
                        msg_extra.append(f"Subiu para Nível {res_xp['nivel_atual']}!")

            # E. Favoritou
            if not estava_favoritado and obj.favorito:
                if not obj.xp_ganho_favorito:
                    obj.xp_ganho_favorito = True
                    obj.save(update_fields=['xp_ganho_favorito'])
                    GamificacaoService.adicionar_xp(request.user, 5)
                    GamificacaoService.conceder_conquista(request.user, 'primeiro_favorito')

        except Exception as e:
            logger.error(f"Erro na gamificação (update): {str(e)}")

        response_data = serializer.data
        if msg_extra:
            response_data['gamificacao_alerts'] = msg_extra

        return Response(response_data)


class SolicitacaoPublicacaoCreateAPIView(APIView):
    """Recebe o formulário de envio de obra (PublicarLivro.jsx) e cria o Livro + a fila de moderação.

    Regras replicadas de biblioteca/views.py::solicitacoes_publicacao (fluxo legado):
    autor/status do Livro vêm do usuário autenticado, nunca do payload do cliente.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    throttle_classes = [UploadRateThrottle]

    def post(self, request, *args, **kwargs):
        perfil_customizado = getattr(request.user, 'perfil_customizado', None)
        if not perfil_customizado or perfil_customizado.tipo not in ['autor', 'admin']:
            return Response(
                {"detail": "Apenas Autores Independentes ou Administradores podem enviar obras."},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SolicitacaoPublicacaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        dados_livro = dict(serializer.validated_data)
        cpf = dados_livro.pop('cpf_autor')
        registro = dados_livro.pop('registro_autoral', '')
        numero_registro = dados_livro.pop('numero_registro', '')
        dados_livro.pop('declaracao_autoria')
        dados_livro.pop('aceitou_termos')

        with transaction.atomic():
            livro = Livro.objects.create(
                autor=request.user.get_full_name() or request.user.username,
                origem='autor_independente',
                status='pendente',
                **dados_livro
            )
            solicitacao = SolicitacaoPublicacao.objects.create(
                usuario=request.user,
                livro=livro,
                status='pendente'
            )
            DeclaracaoAutoria.objects.create(
                solicitacao=solicitacao,
                cpf_digest=salted_hmac('parabook.declaracao.cpf', cpf).hexdigest(),
                cpf_final=cpf[-4:],
                registro_autoral=registro,
                numero_registro=numero_registro,
                versao_termos=settings.TERMS_VERSION,
                ip_origem=request.META.get('REMOTE_ADDR'),
            )

        registrar_acao(
            ator=request.user,
            acao='publicacao.enviada',
            recurso='SolicitacaoPublicacao',
            recurso_id=solicitacao.pk,
            metadados={'livro_id': livro.pk},
        )

        return Response(
            {"detail": "Sua obra foi enviada com sucesso para aprovação!", "livro_id": livro.id},
            status=status.HTTP_201_CREATED
        )


class RecomendacoesIAAPIView(APIView):
    """Recomendacoes personalizadas (recurso exclusivo Premium).

    Mesma heuristica da view legada biblioteca.views.recomendacao_ia_view: cruza as
    categorias ja presentes na estante do usuario e completa a lista com os
    destaques do acervo. A camada de IA generativa segue desativada la e aqui.
    """
    permission_classes = [permissions.IsAuthenticated]
    TOTAL_RECOMENDACOES = 12

    def get(self, request, *args, **kwargs):
        if not usuario_eh_premium(request.user):
            return Response(
                {"detail": "Este recurso é exclusivo para assinantes Premium.", "requer_premium": True},
                status=status.HTTP_403_FORBIDDEN
            )

        user = request.user
        itens_estante = Biblioteca.objects.filter(user=user).select_related('livro__categoria')
        livros_estante_ids = list(itens_estante.values_list('livro_id', flat=True))
        categorias_preferidas_ids = list(
            itens_estante.values_list('livro__categoria_id', flat=True).distinct()
        )

        queryset_base = Livro.objects.filter(status='publicado').exclude(id__in=livros_estante_ids)
        ids_recomendados = []

        if categorias_preferidas_ids:
            ids_recomendados = list(
                queryset_base.filter(categoria_id__in=categorias_preferidas_ids)
                .order_by('-avaliacao', '-id')
                .values_list('id', flat=True)[:8]
            )
            motivo_geral = (
                "Priorizamos categorias presentes na sua estante e, em seguida, "
                "a avaliação média das obras disponíveis."
            )
        else:
            motivo_geral = (
                "Como sua estante ainda está no início, selecionamos os títulos de "
                "maior destaque da nossa comunidade!"
            )

        if len(ids_recomendados) < 8:
            faltam = self.TOTAL_RECOMENDACOES - len(ids_recomendados)
            ids_recomendados.extend(
                queryset_base.exclude(id__in=ids_recomendados)
                .order_by('-avaliacao', '-id')
                .values_list('id', flat=True)[:faltam]
            )

        livros_map = {
            livro.id: livro
            for livro in Livro.objects.filter(id__in=ids_recomendados).select_related('categoria')
        }

        recomendacoes = []
        for livro_id in ids_recomendados:
            livro = livros_map.get(livro_id)
            if not livro:
                continue

            cat_nome = livro.categoria.nome if livro.categoria else "Geral"
            avaliacao = livro.avaliacao or 0

            if livro.categoria_id in categorias_preferidas_ids:
                afinidade = 95 if avaliacao >= 4.0 else 88
                motivo_card = f"Com base no seu interesse em {cat_nome}"
            elif avaliacao >= 4.5:
                afinidade = 92
                motivo_card = "Aclamado pelos leitores do ParaBook"
            else:
                afinidade = 82
                motivo_card = "Destaque do catálogo recomendado para você"

            dados_livro = LivroSerializer(livro, context={'request': request}).data
            dados_livro['afinidade'] = afinidade
            dados_livro['motivo_card'] = motivo_card
            recomendacoes.append(dados_livro)

        return Response({
            "motivo_geral": motivo_geral,
            "metodologia": {
                "tipo": "heuristica",
                "versao": "categorias-avaliacao-v1",
                "usa_ia_generativa": False,
                "sinais": ["categorias da estante", "avaliação média", "obras já adicionadas"],
            },
            "recomendacoes": recomendacoes,
        })
