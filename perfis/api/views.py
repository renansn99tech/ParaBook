# pyrefly: ignore [missing-import]
from rest_framework import generics
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
from perfis.models import Perfil
from .serializers import PerfilSerializer

class PerfilRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = PerfilSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Retorna sempre o perfil do usuário logado (token JWT)
        # O signal provavelmente cria um Perfil ao criar um User, então validamos isso.
        perfil, created = Perfil.objects.get_or_create(usuario=self.request.user)
        return perfil

from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import Count, F, Q
from django.utils import timezone
from usuarios.models import Usuario
from usuarios.services import obter_ou_criar_usuario_customizado
from biblioteca.models import Biblioteca, Livro
from comunidades.models import Comunidade
from gamificacao.models import ConquistaUsuario
from notificacoes.models import Notificacao

class AdiarOnboardingAPIView(APIView):
    """Registra que o modal "Termine seu cadastro" foi exibido/dispensado.

    Incrementa o contador (com teto em 2) tanto no "Terminar depois" quanto no
    "Salvar", garantindo que o lembrete apareça no máximo duas vezes.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        usuario = obter_ou_criar_usuario_customizado(request.user)
        if (usuario.onboarding_lembretes or 0) < 2:
            usuario.onboarding_lembretes = (usuario.onboarding_lembretes or 0) + 1
            usuario.save(update_fields=['onboarding_lembretes'])
        return Response({'onboarding_lembretes': usuario.onboarding_lembretes})


class HistoricoPerfilAPIView(APIView):
    """Linha do tempo privada da jornada do usuário autenticado."""

    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        eventos = []
        eventos_livros = []
        eventos_avaliacoes = []
        livros_lidos = (
            Biblioteca.objects.filter(user=request.user, status='lido')
            .select_related('livro')
            .order_by(
                F('data_conclusao').desc(nulls_last=True),
                F('ultima_leitura_em').desc(nulls_last=True),
                '-data_adicao',
            )[:30]
        )

        for item in livros_lidos:
            eventos_livros.append({
                'id': f'livro-{item.id}',
                'tipo': 'livro',
                'titulo': f'Concluiu “{item.livro.titulo}”',
                'descricao': f'Leitura de {item.livro.autor} finalizada.',
                'data': item.data_conclusao or item.ultima_leitura_em or item.data_adicao,
                'link': f'/livro/{item.livro_id}',
                'metadados': {'livro_id': item.livro_id},
            })

        itens_avaliados = (
            Biblioteca.objects.filter(user=request.user)
            .filter(Q(nota__isnull=False) | (Q(resenha__isnull=False) & ~Q(resenha='')))
            .select_related('livro')
            .order_by(F('avaliada_em').desc(nulls_last=True), '-data_adicao')[:30]
        )
        for item in itens_avaliados:
            detalhes = []
            if item.nota is not None:
                detalhes.append(f'{item.nota} de 5 estrelas')
            if item.resenha:
                resumo = ' '.join(item.resenha.split())
                detalhes.append(f'Resenha: {resumo[:110]}{"…" if len(resumo) > 110 else ""}')
            eventos_avaliacoes.append({
                'id': f'avaliacao-{item.id}',
                'tipo': 'avaliacao',
                'titulo': f'Avaliou “{item.livro.titulo}”',
                'descricao': ' · '.join(detalhes),
                'data': item.avaliada_em or item.data_conclusao or item.data_adicao,
                'link': f'/livro/{item.livro_id}',
                'metadados': {'livro_id': item.livro_id, 'nota': item.nota},
            })

        eventos.extend(eventos_livros)
        eventos.extend(eventos_avaliacoes)

        for notificacao in Notificacao.objects.filter(
            usuario=request.user,
            tipo='COMUNIDADE',
        ).order_by('-data_criacao')[:30]:
            link = notificacao.link if notificacao.link and notificacao.link.startswith('/') else '/notificacoes'
            eventos.append({
                'id': f'comunidade-{notificacao.id}',
                'tipo': 'comunidade',
                'titulo': notificacao.titulo,
                'descricao': notificacao.mensagem,
                'data': notificacao.data_criacao,
                'link': link,
                'metadados': {'lida': notificacao.lida},
            })

        conquistas = (
            ConquistaUsuario.objects.filter(user=request.user)
            .select_related('conquista')
            .order_by('-data_desbloqueio')[:30]
        )
        for desbloqueio in conquistas:
            eventos.append({
                'id': f'conquista-{desbloqueio.id}',
                'tipo': 'conquista',
                'titulo': f'Conquista desbloqueada: {desbloqueio.conquista.nome}',
                'descricao': desbloqueio.conquista.descricao,
                'data': desbloqueio.data_desbloqueio,
                'link': '/minhas-conquistas',
                'metadados': {
                    'slug': desbloqueio.conquista.slug,
                    'xp': desbloqueio.conquista.pontos_recompensa,
                },
            })

        eventos.sort(key=lambda evento: evento['data'], reverse=True)
        return Response({
            'eventos': eventos[:60],
            'total': len(eventos),
            'recentes': {
                'livros': eventos_livros[:10],
                'avaliacoes': eventos_avaliacoes[:10],
            },
        })


class PerfilPublicoAPIView(APIView):
    def get(self, request, username, *args, **kwargs):
        try:
            dados_usuario = Usuario.objects.get(user_auth__username=username)
        except Usuario.DoesNotExist:
            user_auth_obj = get_object_or_404(Usuario.user_auth.field.related_model, username=username)
            if user_auth_obj.is_superuser:
                perfil, _ = Perfil.objects.get_or_create(usuario=user_auth_obj, defaults={"descricao_perfil": "Administrador do Sistema"})
                dados_usuario, _ = Usuario.objects.get_or_create(
                    user_auth=user_auth_obj, 
                    defaults={"nome": "Super User", "tipo": "admin", "perfil": perfil, "termos_aceitos": True}
                )
            else:
                return Response({"detail": "Não encontrado."}, status=404)

        user_auth_obj = dados_usuario.user_auth

        # O React vai tratar se o username é igual ao user.username logado, mas mandamos um flag caso precise:
        is_owner = request.user.is_authenticated and request.user == user_auth_obj

        perfil_do_usuario = dados_usuario.perfil
        if perfil_do_usuario is None:
            perfil_do_usuario, _ = Perfil.objects.get_or_create(usuario=user_auth_obj)
            dados_usuario.perfil = perfil_do_usuario
            dados_usuario.save(update_fields=['perfil'])

        # REGRAS DE TRAVA
        if not is_owner and not (request.user.is_authenticated and request.user.is_superuser):
            if dados_usuario.tipo == 'admin' or user_auth_obj.is_superuser:
                return Response({"erro": "Acesso negado a perfis administrativos.", "status_block": "admin"}, status=403)
            if perfil_do_usuario.perfil_privado:
                return Response({"erro": "Este perfil é privado.", "status_block": "privado"}, status=403)

        meus_livros = Biblioteca.objects.filter(user=user_auth_obj)
        qnt_livros_lidos = meus_livros.filter(status='lido').count()
        lidos_ano = meus_livros.filter(
            status='lido',
            data_conclusao__year=timezone.localdate().year,
        ).count()
        qnt_lendo_agora = meus_livros.filter(status='lendo').count()
        qnt_avaliados = meus_livros.filter(nota__isnull=False).count()

        minhas_comunidades = Comunidade.objects.filter(membros=user_auth_obj)
        qnt_comunidades = minhas_comunidades.count()

        top_generos = list(
            meus_livros.values('livro__categoria__nome')
            .annotate(total=Count('livro__categoria__nome'))
            .order_by('-total', 'livro__categoria__nome')[:3]
        )
        lista_generos_favoritos = [item['livro__categoria__nome'] for item in top_generos if item['livro__categoria__nome']]

        top_autores = meus_livros.values('livro__autor').annotate(total=Count('livro__autor')).order_by('-total')[:3]
        lista_autores_favoritos = [item['livro__autor'] for item in top_autores if item['livro__autor']]

        ultimo_lido = meus_livros.filter(status='lido').order_by('-id').first()
        leitura_em_andamento = meus_livros.filter(status='lendo').select_related('livro').order_by('-ultima_leitura_em', '-data_adicao').first()
        historico_livros = meus_livros.filter(status='lido').order_by('-id')[:10]

        # Livros marcados com o coração na tela de leitura. O front lê
        # `favoritos.livros`, que antes nunca era preenchido.
        livros_favoritos = meus_livros.filter(favorito=True).select_related('livro')

        # Os interesses são derivados de sinais já existentes e não de
        # rastreamento invisível: estante, notas e publicações em comunidades.
        comunidades_interesse = list(
            minhas_comunidades.filter(em_manutencao=False)
            .annotate(
                participacoes=Count(
                    'postagens',
                    filter=Q(postagens__autor=user_auth_obj),
                )
            )
            .order_by('-participacoes', 'nome')[:3]
        )

        recomendacao = None
        if dados_usuario.tipo == 'autor':
            livro_recomendado = (
                Livro.objects.filter(
                    solicitacao_publicacao__usuario=user_auth_obj,
                    solicitacao_publicacao__status='aprovado',
                    status='publicado',
                )
                .order_by('-avaliacao', '-id')
                .first()
            )
            if livro_recomendado:
                recomendacao = {
                    'id': livro_recomendado.id,
                    'titulo': livro_recomendado.titulo,
                    'autor': livro_recomendado.autor,
                    'tipo': 'autor',
                    'rotulo': 'Recomendação do Autor',
                    'criterio': 'Obra própria publicada em destaque',
                    'nota': float(livro_recomendado.avaliacao),
                }
        else:
            item_recomendado = (
                meus_livros.filter(nota__isnull=False, livro__status='publicado')
                .select_related('livro')
                .order_by('-nota', '-ultima_leitura_em', '-id')
                .first()
                or meus_livros.filter(favorito=True, livro__status='publicado')
                .select_related('livro')
                .order_by('-ultima_leitura_em', '-id')
                .first()
            )
            if item_recomendado:
                recomendacao = {
                    'id': item_recomendado.livro.id,
                    'titulo': item_recomendado.livro.titulo,
                    'autor': item_recomendado.livro.autor,
                    'tipo': 'leitor',
                    'rotulo': 'Recomendação do Leitor',
                    'criterio': 'Sua obra mais bem avaliada' if item_recomendado.nota else 'Obra marcada como favorita',
                    'nota': item_recomendado.nota,
                }

        return Response({
            "is_owner": is_owner,
            "usuario": {
                "username": user_auth_obj.username,
                "nome": dados_usuario.nome,
                "tipo": dados_usuario.tipo
            },
            "perfil": {
                "foto": request.build_absolute_uri(perfil_do_usuario.foto.url) if perfil_do_usuario.foto else None,
                "capa": request.build_absolute_uri(perfil_do_usuario.capa.url) if perfil_do_usuario.capa else None,
                "bio": perfil_do_usuario.bio,
                "descricao_perfil": perfil_do_usuario.descricao_perfil,
                "localizacao": perfil_do_usuario.localizacao,
                "historico_txt": perfil_do_usuario.historico,
                "meta_leitura_anual": perfil_do_usuario.meta_leitura_anual,
            },
            "estatisticas": {
                "total_lidos": qnt_livros_lidos,
                "lendo_agora": qnt_lendo_agora,
                "total_avaliados": qnt_avaliados,
                "total_comunidades": qnt_comunidades,
                "lidos_ano": lidos_ano,
                "meta_leitura_anual": perfil_do_usuario.meta_leitura_anual,
            },
            "favoritos": {
                "generos": lista_generos_favoritos,
                "autores": lista_autores_favoritos,
                "livros": [
                    {
                        "id": item.livro.id,
                        "estante_id": item.id,
                        "titulo": item.livro.titulo,
                        "autor": item.livro.autor,
                        "capa": request.build_absolute_uri(item.livro.capa.url) if item.livro.capa else None,
                    }
                    for item in livros_favoritos
                ]
            },
            "ultimo_lido": {
                "titulo": ultimo_lido.livro.titulo if ultimo_lido else None
            },
            "leitura_em_andamento": {
                "id": leitura_em_andamento.livro.id,
                "estante_id": leitura_em_andamento.id,
                "titulo": leitura_em_andamento.livro.titulo,
                "pagina_atual": leitura_em_andamento.pagina_atual,
                "total_paginas": leitura_em_andamento.livro.paginas,
                "progresso_percentual": round(
                    (leitura_em_andamento.pagina_atual / leitura_em_andamento.livro.paginas) * 100
                ) if leitura_em_andamento.livro.paginas else 0,
                "ultima_leitura_em": leitura_em_andamento.ultima_leitura_em,
            } if leitura_em_andamento else None,
            "historico": [
                {"id": h.id, "titulo": h.livro.titulo, "data": "Recente"} for h in historico_livros
            ],
            "comunidades": [
                {"id": c.id, "nome": c.nome, "descricao": c.descricao} for c in minhas_comunidades
            ],
            "interesses": {
                "generos": [
                    {"nome": item['livro__categoria__nome'], "total": item['total']}
                    for item in top_generos
                    if item['livro__categoria__nome']
                ],
                "comunidades": [
                    {
                        "id": comunidade.id,
                        "nome": comunidade.nome,
                        "participacoes": comunidade.participacoes,
                    }
                    for comunidade in comunidades_interesse
                ],
                "recomendacao": recomendacao,
            },
        })

class SolicitarAutorAPIView(APIView):
    """Registra o aceite do onboarding e envia o usuario para a fila de aprovacao de autor.

    Mesmas guardas da view legada perfis.views.onboarding_autor: quem ja e autor,
    admin ou tem solicitacao em andamento nao entra na fila de novo.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, *args, **kwargs):
        usuario_custom = obter_ou_criar_usuario_customizado(request.user)

        if usuario_custom.tipo in ['autor', 'admin', 'aguardando_aprovacao']:
            return Response(
                {"detail": "Você já possui uma solicitação em andamento ou privilégios de publicação."},
                status=409
            )

        usuario_custom.tipo = 'aguardando_aprovacao'
        usuario_custom.save(update_fields=['tipo'])

        return Response({
            "detail": "Sua solicitação para Autor Independente está em análise pela nossa equipe.",
            "tipo": usuario_custom.tipo,
        })


class AutoresListAPIView(APIView):
    def get(self, request, *args, **kwargs):
        autores = Usuario.objects.filter(tipo='autor').select_related('user_auth', 'perfil')
        data = []
        for autor in autores:
            # Conta obras aprovadas deste autor
            total_obras = Livro.objects.filter(
                solicitacao_publicacao__usuario=autor.user_auth,
                status='publicado'
            ).count()
            
            perfil = autor.perfil
            
            data.append({
                "id": autor.id,
                "username": autor.user_auth.username,
                "nome": autor.nome,
                "foto": perfil.foto.url if perfil and perfil.foto else None,
                "biografia": perfil.bio if perfil else "",
                "total_obras": total_obras
            })
        
        # Order by total_obras descending
        data.sort(key=lambda x: x['total_obras'], reverse=True)
        return Response(data)
