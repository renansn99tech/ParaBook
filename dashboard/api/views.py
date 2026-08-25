import csv
import json
import logging
from urllib.parse import parse_qs, urlparse

# pyrefly: ignore [missing-import]
from django.core.cache import cache
from django.db.models import Count, Q
from django.http import HttpResponse
from django.urls import NoReverseMatch, reverse
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.pagination import CursorPagination
from rest_framework.permissions import AllowAny
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction
from comunidades.models import Comunidade, DenunciaComunidade, PostagemComunidade
from biblioteca.models import Livro, Denuncia, SolicitacaoPublicacao
from usuarios.models import Usuario, AuditoriaAcao
from usuarios.audit import registrar_acao
from notificacoes.models import Notificacao
from dashboard.models import FeatureFlag
from assinaturas.models import Assinatura, Plano
from dashboard.api.permissions import IsParaBookAdmin

User = get_user_model()
logger = logging.getLogger(__name__)

FEATURE_FLAGS_PUBLICAS = ('banner_anuncios',)


AUDITORIA_PREFIXOS = {
    'moderacao': ('moderacao.', 'livro.', 'denuncia.'),
    'conta': ('conta.', 'seguranca.', 'lgpd.'),
    'plataforma': ('feature_flag.', 'django_admin.', 'comunidade.', 'postagem.'),
}

AUDITORIA_FILTROS = {
    'moderacao': (
        Q(acao__startswith='moderacao.')
        | Q(acao__startswith='livro.')
        | Q(acao__startswith='denuncia.')
    ),
    'conta': (
        Q(acao__startswith='conta.')
        | Q(acao__startswith='seguranca.')
        | Q(acao__startswith='lgpd.')
    ),
    'plataforma': (
        Q(acao__startswith='feature_flag.')
        | Q(acao__startswith='django_admin.')
        | Q(acao__startswith='comunidade.')
        | Q(acao__startswith='postagem.')
    ),
}


def _tipo_auditoria(acao):
    for tipo, prefixos in AUDITORIA_PREFIXOS.items():
        if acao.startswith(prefixos):
            return tipo
    return 'sistema'


def _serializar_auditoria(registro):
    return {
        'id': registro.pk,
        'ator': registro.ator.username if registro.ator else 'Sistema',
        'acao': registro.acao,
        'tipo': _tipo_auditoria(registro.acao),
        'recurso': registro.recurso,
        'recurso_id': registro.recurso_id,
        'sucesso': registro.sucesso,
        'metadados': registro.metadados,
        'criado_em': registro.criado_em,
    }


def _celula_csv_segura(valor):
    texto = str(valor if valor is not None else '')
    if texto.lstrip().startswith(('=', '+', '-', '@')):
        return f"'{texto}"
    return texto


class AuditoriaCursorPagination(CursorPagination):
    page_size = 20
    ordering = ('-criado_em', '-pk')
    cursor_query_param = 'cursor'


MODELOS_DJANGO_ADMIN = (
    ('usuarios', 'Usuários', Usuario, 'fa-user-shield'),
    ('assinaturas', 'Assinaturas', Assinatura, 'fa-receipt'),
    ('planos', 'Planos', Plano, 'fa-credit-card'),
    ('comunidades', 'Comunidades', Comunidade, 'fa-users'),
    ('postagens', 'Postagens', PostagemComunidade, 'fa-comments'),
    ('denuncias', 'Denúncias', Denuncia, 'fa-flag'),
)

class EstatisticasDashboardAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def get(self, request, *args, **kwargs):
        total_usuarios = User.objects.count()
        total_comunidades = Comunidade.objects.count()
        total_livros = Livro.objects.count()
        perfis_pendentes = Usuario.objects.filter(
            tipo='aguardando_aprovacao',
            user_auth__isnull=False,
        ).select_related('user_auth')
        publicacoes_pendentes = SolicitacaoPublicacao.objects.filter(
            status='pendente',
        ).select_related('livro', 'usuario')
        denuncias_livros = Denuncia.objects.filter(
            arquivada=False,
        ).select_related('livro', 'usuario')
        denuncias_comunidades = DenunciaComunidade.objects.filter(
            status='pendente',
        ).select_related('comunidade', 'usuario')
        livros_removidos = Livro.objects.filter(status='removido')
        denuncias_arquivadas = Denuncia.objects.filter(arquivada=True)

        aprovacoes_pendentes = perfis_pendentes.count() + publicacoes_pendentes.count()
        denuncias_abertas = denuncias_livros.count() + denuncias_comunidades.count()
        itens_lixeira = livros_removidos.count() + denuncias_arquivadas.count()

        turno = [
            *[{
                'id': item.pk,
                'categoria': 'autor',
                'fila': 'aprovacoes',
                'titulo': f'@{item.user_auth.username} quer se tornar Autor',
                'detalhe': 'Solicitação de perfil de Autor Independente',
                'criado_em': item.user_auth.date_joined,
                'data_aproximada': True,
                'acao': 'aprovar',
                'acao_label': 'Aprovar',
            } for item in perfis_pendentes[:5]],
            *[{
                'id': item.pk,
                'categoria': 'publicacao',
                'fila': 'aprovacoes',
                'titulo': item.livro.titulo if item.livro else 'Publicação sem título',
                'detalhe': f'Publicação enviada por @{item.usuario.username}',
                'criado_em': item.data_envio,
                'data_aproximada': False,
                'acao': 'aprovar',
                'acao_label': 'Aprovar',
            } for item in publicacoes_pendentes[:5]],
            *[{
                'id': item.pk,
                'categoria': 'livro',
                'fila': 'denuncias',
                'titulo': item.livro.titulo,
                'detalhe': f'Denúncia de livro: {item.motivo}',
                'criado_em': item.data_denuncia,
                'data_aproximada': False,
                'acao': 'aprovar',
                'acao_label': 'Acolher',
            } for item in denuncias_livros[:5]],
            *[{
                'id': item.pk,
                'categoria': 'comunidade',
                'fila': 'denuncias',
                'titulo': item.comunidade.nome,
                'detalhe': f'Denúncia de comunidade: {item.motivo}',
                'criado_em': item.data_denuncia,
                'data_aproximada': False,
                'acao': 'aprovar',
                'acao_label': 'Acolher',
            } for item in denuncias_comunidades[:5]],
        ]
        turno.sort(key=lambda item: item['criado_em'] or timezone.now())
        turno = turno[:8]

        ultima_decisao = AuditoriaAcao.objects.filter(
            acao__startswith='moderacao.',
        ).select_related('ator').first()
        atividade = AuditoriaAcao.objects.select_related('ator')[:5]

        return Response({
            "estatisticas": {
                "total_usuarios": total_usuarios,
                "total_comunidades": total_comunidades,
                "total_livros": total_livros,
                "obras_publicadas": Livro.objects.filter(status='publicado').count(),
                "aprovacoes_pendentes": aprovacoes_pendentes,
                "denuncias_abertas": denuncias_abertas,
                "novos_usuarios_hoje": User.objects.filter(
                    date_joined__date=timezone.localdate()
                ).count(),
                "comunidades_oficiais": Comunidade.objects.filter(criada_por_sistema=True).count(),
            },
            "pendencias": {
                "aprovacoes": aprovacoes_pendentes,
                "denuncias": denuncias_abertas,
                "lixeira": itens_lixeira,
            },
            "turno": {
                "itens": turno,
                "ultima_decisao": _serializar_auditoria(ultima_decisao) if ultima_decisao else None,
            },
            "atividade": [_serializar_auditoria(registro) for registro in atividade],
        })

class DashboardUsuariosAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def get(self, request, *args, **kwargs):
        usuarios = []
        queryset = User.objects.select_related('perfil_customizado', 'perfil').order_by('-date_joined')
        for user in queryset:
            dados_usuario = getattr(user, 'perfil_customizado', None)
            usuarios.append({
                "id": user.id,
                "username": user.username,
                "nome": dados_usuario.nome if dados_usuario and dados_usuario.nome else user.get_full_name() or user.username,
                "email": user.email,
                "tipo": dados_usuario.tipo if dados_usuario else ('admin' if user.is_superuser else 'leitor'),
                "is_staff": user.is_staff,
                "is_superuser": user.is_superuser,
                "is_active": user.is_active,
                "last_login": user.last_login,
                "date_joined": user.date_joined,
            })
        return Response(usuarios)

class DashboardAprovacoesAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def get(self, request, *args, **kwargs):
        perfis_pendentes = Usuario.objects.filter(
            tipo='aguardando_aprovacao',
            user_auth__isnull=False,
        ).select_related('user_auth', 'perfil').annotate(
            total_lidos=Count(
                'user_auth__itens_biblioteca',
                filter=Q(user_auth__itens_biblioteca__status='lido'),
                distinct=True,
            ),
            obras_enviadas=Count('user_auth__solicitacoes_publicacao', distinct=True),
        )
        solicitacoes_pendentes = SolicitacaoPublicacao.objects.filter(
            status='pendente',
        ).select_related('livro', 'livro__categoria', 'usuario')
        
        lista_perfis = [{
            "id": p.id,
            "username": p.user_auth.username,
            "nome": p.nome or p.user_auth.username,
            "bio": p.perfil.bio if p.perfil else '',
            "data": p.user_auth.date_joined,
            "data_aproximada": True,
            "livros_lidos": p.total_lidos,
            "obras_enviadas": p.obras_enviadas,
        } for p in perfis_pendentes]

        lista_publicacoes = [{
            "id": s.id,
            "livro_id": s.livro_id,
            "titulo_livro": s.livro.titulo if s.livro else 'Sem Título',
            "autor": s.usuario.username,
            "data_envio": s.data_envio,
            "categoria": s.livro.categoria.nome if s.livro and s.livro.categoria else 'Não informada',
            "isbn": s.livro.isbn if s.livro else None,
            "tem_capa": bool(s.livro and s.livro.capa),
        } for s in solicitacoes_pendentes]

        return Response({
            "perfis": lista_perfis,
            "publicacoes": lista_publicacoes
        })

class DashboardDenunciasAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def get(self, request, *args, **kwargs):
        denuncias_livros = Denuncia.objects.filter(arquivada=False).select_related('livro', 'usuario')
        denuncias_comuns = DenunciaComunidade.objects.filter(status='pendente').select_related('comunidade', 'usuario')

        lista_dl = [{
            "id": d.id,
            "livro": d.livro.titulo,
            "denunciante": d.usuario.username if d.usuario else 'Anônimo',
            "motivo": d.motivo,
            "status": d.status,
            "data": d.data_denuncia,
        } for d in denuncias_livros]

        lista_dc = [{
            "id": c.id,
            "comunidade": c.comunidade.nome,
            "denunciante": c.usuario.username if c.usuario else 'Anônimo',
            "motivo": c.motivo,
            "data": c.data_denuncia,
        } for c in denuncias_comuns]

        return Response({
            "livros": lista_dl,
            "comunidades": lista_dc
        })


class DashboardModeracaoAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    @transaction.atomic
    def post(self, request, categoria, item_id, *args, **kwargs):
        acao = request.data.get('acao')
        if acao not in {'aprovar', 'recusar'}:
            return Response({'acao': ['Use aprovar ou recusar.']}, status=400)
        observacao = str(request.data.get('observacao', '')).strip()[:1000]

        if categoria == 'autor':
            usuario = Usuario.objects.select_for_update(of=('self',)).select_related('user_auth').filter(
                pk=item_id,
                tipo='aguardando_aprovacao',
            ).first()
            if not usuario:
                return Response({'detail': 'Solicitação já processada ou inexistente.'}, status=409)
            usuario.tipo = 'autor' if acao == 'aprovar' else 'leitor'
            usuario.notificacao_autor = acao == 'aprovar'
            usuario.save(update_fields=['tipo', 'notificacao_autor'])
            Notificacao.objects.create(
                usuario=usuario.user_auth,
                titulo='Solicitação de autor analisada',
                mensagem=(
                    'Seu perfil de Autor Independente foi aprovado.'
                    if acao == 'aprovar'
                    else f'Sua solicitação não foi aprovada.{" " + observacao if observacao else ""}'
                ),
                tipo='SISTEMA',
                link='/perfil',
            )
            recurso = usuario

        elif categoria == 'publicacao':
            solicitacao = SolicitacaoPublicacao.objects.select_for_update(of=('self',)).select_related('livro', 'usuario').filter(
                pk=item_id,
                status='pendente',
            ).first()
            if not solicitacao:
                return Response({'detail': 'Solicitação já processada ou inexistente.'}, status=409)
            solicitacao.status = 'aprovado' if acao == 'aprovar' else 'rejeitado'
            solicitacao.observacao_admin = observacao
            solicitacao.data_analise = timezone.now()
            solicitacao.save(update_fields=['status', 'observacao_admin', 'data_analise'])
            solicitacao.livro.status = 'publicado' if acao == 'aprovar' else 'rejeitado'
            solicitacao.livro.save(update_fields=['status'])
            Notificacao.objects.create(
                usuario=solicitacao.usuario,
                titulo='Publicação analisada',
                mensagem=(
                    f'A obra “{solicitacao.livro.titulo}” foi aprovada.'
                    if acao == 'aprovar'
                    else f'A obra “{solicitacao.livro.titulo}” foi recusada.{" " + observacao if observacao else ""}'
                ),
                tipo='SOLICITACAO',
                link='/perfil',
            )
            recurso = solicitacao

        elif categoria == 'livro':
            denuncia = Denuncia.objects.select_for_update(of=('self',)).select_related('livro').filter(
                pk=item_id,
                arquivada=False,
            ).first()
            if not denuncia:
                return Response({'detail': 'Denúncia já processada ou inexistente.'}, status=409)
            agora = timezone.now()
            denuncia.arquivada = True
            denuncia.data_arquivamento = agora
            denuncia.status = 'removido' if acao == 'aprovar' else 'analisado'
            denuncia.save(update_fields=['arquivada', 'data_arquivamento', 'status'])
            if acao == 'aprovar':
                denuncia.livro.status = 'removido'
                denuncia.livro.data_remocao = agora
                denuncia.livro.save(update_fields=['status', 'data_remocao'])
                Denuncia.objects.filter(
                    livro=denuncia.livro,
                    arquivada=False,
                ).update(arquivada=True, data_arquivamento=agora, status='removido')
            recurso = denuncia

        elif categoria == 'comunidade':
            denuncia = DenunciaComunidade.objects.select_for_update(of=('self',)).select_related('comunidade').filter(
                pk=item_id,
                status='pendente',
            ).first()
            if not denuncia:
                return Response({'detail': 'Denúncia já processada ou inexistente.'}, status=409)
            denuncia.status = 'acolhida' if acao == 'aprovar' else 'arquivada'
            denuncia.data_analise = timezone.now()
            denuncia.save(update_fields=['status', 'data_analise'])
            if acao == 'aprovar':
                denuncia.comunidade.em_manutencao = True
                denuncia.comunidade.save(update_fields=['em_manutencao'])
                DenunciaComunidade.objects.filter(
                    comunidade=denuncia.comunidade,
                    status='pendente',
                ).update(status='acolhida', data_analise=denuncia.data_analise)
            elif denuncia.comunidade.total_denuncias > 0:
                denuncia.comunidade.total_denuncias -= 1
                denuncia.comunidade.save(update_fields=['total_denuncias'])
            recurso = denuncia

        else:
            return Response({'detail': 'Categoria de moderação inválida.'}, status=404)

        registrar_acao(
            ator=request.user,
            acao=f'moderacao.{categoria}.{acao}',
            recurso=recurso.__class__.__name__,
            recurso_id=recurso.pk,
            metadados={'observacao_informada': bool(observacao)},
        )
        return Response({'detail': 'Decisão registrada com sucesso.', 'categoria': categoria, 'acao': acao})


class DashboardAuditoriaAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def get(self, request, *args, **kwargs):
        formato = request.query_params.get('formato', '').lower()
        tipo = request.query_params.get('tipo', '').lower()
        filtro_tipo = AUDITORIA_FILTROS.get(tipo)
        registros_base = AuditoriaAcao.objects.select_related('ator').all()
        registros_filtrados = registros_base.filter(filtro_tipo) if filtro_tipo else registros_base

        if formato == 'csv':
            resposta = HttpResponse(content_type='text/csv; charset=utf-8')
            resposta['Content-Disposition'] = 'attachment; filename="auditoria-parabook.csv"'
            resposta.write('\ufeff')
            escritor = csv.writer(resposta)
            escritor.writerow(['ID', 'Data', 'Ator', 'Ação', 'Recurso', 'ID do recurso', 'Sucesso', 'Metadados'])
            for registro in registros_filtrados[:10000]:
                escritor.writerow([
                    registro.pk,
                    registro.criado_em.isoformat(),
                    _celula_csv_segura(registro.ator.username if registro.ator else 'Sistema'),
                    _celula_csv_segura(registro.acao),
                    _celula_csv_segura(registro.recurso),
                    _celula_csv_segura(registro.recurso_id),
                    'sim' if registro.sucesso else 'não',
                    _celula_csv_segura(json.dumps(registro.metadados, ensure_ascii=False, default=str)),
                ])
            return resposta

        if formato == 'avancado':
            paginador = AuditoriaCursorPagination()
            pagina = paginador.paginate_queryset(registros_filtrados, request, view=self)
            proximo_link = paginador.get_next_link()
            proximo_cursor = None
            if proximo_link:
                proximo_cursor = parse_qs(urlparse(proximo_link).query).get('cursor', [None])[0]
            return Response({
                'resultados': [_serializar_auditoria(registro) for registro in pagina],
                'proximo_cursor': proximo_cursor,
                'contagens': {
                    'tudo': registros_base.count(),
                    **{
                        chave: registros_base.filter(filtro).count()
                        for chave, filtro in AUDITORIA_FILTROS.items()
                    },
                },
                'eventos_hoje': registros_base.filter(criado_em__date=timezone.localdate()).count(),
                'filtro': tipo if filtro_tipo else 'tudo',
            })

        try:
            limite_solicitado = int(request.query_params.get('limite', 50))
        except (TypeError, ValueError):
            limite_solicitado = 50
        limite = min(max(limite_solicitado, 1), 200)
        return Response([
            _serializar_auditoria(registro)
            for registro in registros_base[:limite]
        ])


class DashboardModelosAdminAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def get(self, request, *args, **kwargs):
        cache_key = 'dashboard:modelos-admin:contagens:v1'
        contagens = cache.get(cache_key)
        if contagens is None:
            contagens = {}
            for chave, _nome, model, _icone in MODELOS_DJANGO_ADMIN:
                try:
                    contagens[chave] = model.objects.count()
                except Exception:
                    logger.exception('Falha ao contar o modelo administrativo %s', chave)
                    contagens[chave] = None
            cache.set(cache_key, contagens, 300)

        modelos = []
        for chave, nome, model, icone in MODELOS_DJANGO_ADMIN:
            meta = model._meta
            try:
                caminho_admin = reverse(f'admin:{meta.app_label}_{meta.model_name}_changelist')
            except NoReverseMatch:
                continue
            modelos.append({
                'chave': chave,
                'nome': nome,
                'modelo': f'{meta.app_label}.{model.__name__}',
                'icone': icone,
                'contagem': contagens.get(chave),
                'url': request.build_absolute_uri(caminho_admin),
            })

        ultimo_acesso = AuditoriaAcao.objects.filter(
            acao='django_admin.atalho_aberto',
        ).values_list('criado_em', flat=True).first()
        return Response({
            'modelos': modelos,
            'django_admin_url': request.build_absolute_uri(reverse('admin:index')),
            'ultimo_acesso': ultimo_acesso,
        })


class DashboardDjangoAdminAcessoAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def post(self, request, *args, **kwargs):
        registrar_acao(
            ator=request.user,
            acao='django_admin.atalho_aberto',
            recurso='AdminSite',
            metadados={'origem': 'perfil_avancado'},
        )
        return Response({'url': request.build_absolute_uri(reverse('admin:index'))})


class DashboardFeatureFlagsAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def get(self, request, *args, **kwargs):
        return Response([
            {
                'chave': flag.chave,
                'descricao': flag.descricao,
                'habilitada': flag.habilitada,
                'disponivel': flag.disponivel,
                'atualizada_em': flag.atualizada_em,
                'atualizada_por': flag.atualizada_por.username if flag.atualizada_por else None,
            }
            for flag in FeatureFlag.objects.select_related('atualizada_por')
        ])

    @transaction.atomic
    def patch(self, request, *args, **kwargs):
        chave = request.data.get('chave')
        habilitada = request.data.get('habilitada')
        if not isinstance(habilitada, bool):
            return Response({'habilitada': ['Use verdadeiro ou falso.']}, status=400)
        flag = FeatureFlag.objects.select_for_update().filter(chave=chave).first()
        if not flag:
            return Response({'detail': 'Feature flag inexistente; chaves não podem ser criadas pela API.'}, status=404)
        if not flag.disponivel:
            return Response(
                {'detail': 'Esta funcionalidade ainda está indisponível e não pode ser alterada.'},
                status=409,
            )
        flag.habilitada = habilitada
        flag.atualizada_por = request.user
        flag.save(update_fields=['habilitada', 'atualizada_por', 'atualizada_em'])
        registrar_acao(
            ator=request.user,
            acao='feature_flag.alterada',
            recurso='FeatureFlag',
            recurso_id=flag.pk,
            metadados={'chave': flag.chave, 'habilitada': flag.habilitada},
        )
        return Response({'chave': flag.chave, 'habilitada': flag.habilitada})


class DashboardFeatureFlagsPublicasAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        estados = {chave: False for chave in FEATURE_FLAGS_PUBLICAS}
        estados.update({
            flag.chave: flag.habilitada and flag.disponivel
            for flag in FeatureFlag.objects.filter(chave__in=FEATURE_FLAGS_PUBLICAS)
        })
        return Response(estados)

class DashboardLixeiraAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def get(self, request, *args, **kwargs):
        livros_removidos = Livro.objects.filter(status='removido').order_by('-data_remocao')
        denuncias_arquivadas = Denuncia.objects.filter(arquivada=True).select_related('livro').order_by('-data_arquivamento')

        lista_livros = [{
            "id": l.id,
            "titulo": l.titulo,
            "data_remocao": l.data_remocao,
            "dias_retencao": 7,
        } for l in livros_removidos]

        lista_denuncias = [{
            "id": d.id,
            "livro": d.livro.titulo if d.livro else 'Removido',
            "motivo": d.motivo,
            "data_arquivamento": d.data_arquivamento,
            "dias_retencao": 30,
        } for d in denuncias_arquivadas]

        return Response({
            "obras": lista_livros,
            "denuncias": lista_denuncias
        })

    def post(self, request, *args, **kwargs):
        acao = request.data.get('acao')
        item_id = request.data.get('item_id')

        if not acao or not item_id:
            return Response({"erro": "Ação ou ID inválidos"}, status=400)

        if acao == 'restaurar_livro':
            try:
                livro = Livro.objects.get(id=item_id)
                livro.status = 'publicado'
                livro.data_remocao = None
                livro.save()
                registrar_acao(
                    ator=request.user,
                    acao='livro.restaurado',
                    recurso='Livro',
                    recurso_id=livro.pk,
                )
                return Response({"sucesso": f"Livro {livro.titulo} restaurado."})
            except Livro.DoesNotExist:
                return Response({"erro": "Livro não encontrado."}, status=404)

        elif acao == 'excluir_livro_permanente':
            try:
                livro = Livro.objects.get(id=item_id)
                livro_id = livro.pk
                livro.delete()
                registrar_acao(
                    ator=request.user,
                    acao='livro.excluido_permanente',
                    recurso='Livro',
                    recurso_id=livro_id,
                )
                return Response({"sucesso": "Livro apagado permanentemente."})
            except Livro.DoesNotExist:
                return Response({"erro": "Livro não encontrado."}, status=404)

        elif acao == 'excluir_denuncia_permanente':
            try:
                denuncia = Denuncia.objects.get(id=item_id)
                denuncia_id = denuncia.pk
                denuncia.delete()
                registrar_acao(
                    ator=request.user,
                    acao='denuncia.excluida_permanente',
                    recurso='Denuncia',
                    recurso_id=denuncia_id,
                )
                return Response({"sucesso": "Denúncia apagada permanentemente."})
            except Denuncia.DoesNotExist:
                return Response({"erro": "Denúncia não encontrada."}, status=404)

        return Response({"erro": "Ação inválida"}, status=400)
