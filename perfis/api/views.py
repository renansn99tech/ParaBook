# pyrefly: ignore [missing-import]
from rest_framework import generics
# pyrefly: ignore [missing-import]
from rest_framework.permissions import AllowAny, IsAuthenticated
from perfis.models import Perfil
from .serializers import (
    PerfilSerializer,
    calcular_idade,
    interpretar_data_nascimento,
)

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
from usuarios.models import SessaoDispositivo, Usuario
from usuarios.services import obter_ou_criar_usuario_customizado
from usuarios.permissions import eh_admin_parabook
from biblioteca.models import Biblioteca, Denuncia, Livro, SolicitacaoPublicacao
from comunidades.models import Comunidade, DenunciaComunidade, PostagemComunidade
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


class ResumoLeituraAPIView(APIView):
    """Resumo privado e enxuto da jornada exibido na página inicial."""

    permission_classes = [IsAuthenticated]
    LIMITE_SESSAO_SEGUNDOS = 8 * 60 * 60

    def get(self, request, *args, **kwargs):
        itens = Biblioteca.objects.filter(user=request.user).select_related(
            'livro', 'livro__categoria',
        )
        leitura_atual = itens.filter(status='lendo').order_by(
            F('ultima_leitura_em').desc(nulls_last=True), '-data_adicao',
        ).first()
        ultima_concluida = itens.filter(status='lido').order_by(
            F('data_conclusao').desc(nulls_last=True), '-data_adicao',
        ).first()

        generos = list(
            itens.exclude(livro__categoria__nome__isnull=True)
            .exclude(livro__categoria__nome='')
            .values('livro__categoria__nome')
            .annotate(total=Count('id'))
            .order_by('-total', 'livro__categoria__nome')
        )
        avaliacoes_feitas = itens.filter(
            Q(nota__isnull=False) | (Q(resenha__isnull=False) & ~Q(resenha=''))
        ).count()

        sessoes = SessaoDispositivo.objects.filter(usuario=request.user).only(
            'criada_em', 'ultima_atividade_em',
        ).order_by('-criada_em')[:30]
        duracoes = [
            min(
                max(0, int((sessao.ultima_atividade_em - sessao.criada_em).total_seconds())),
                self.LIMITE_SESSAO_SEGUNDOS,
            )
            for sessao in sessoes
        ]
        tempo_medio_segundos = round(sum(duracoes) / len(duracoes)) if duracoes else 0

        respostas_de_outros = ~Q(respostas__autor=request.user)
        postagens_com_respostas = (
            PostagemComunidade.objects.filter(autor=request.user)
            .select_related('comunidade')
            .annotate(
                respostas_outros=Count(
                    'respostas', filter=respostas_de_outros, distinct=True,
                ),
                participantes_outros=Count(
                    'respostas__autor', filter=respostas_de_outros, distinct=True,
                ),
            )
            .filter(respostas_outros__gt=0)
            .order_by('-respostas_outros', '-participantes_outros', '-criado_em')
        )
        total_postagens_relevantes = postagens_com_respostas.count()
        postagens_relevantes = list(postagens_com_respostas[:3])

        def serializar_leitura(item, em_andamento):
            if item is None:
                return None
            total_paginas = item.livro.paginas or 0
            progresso = round((item.pagina_atual / total_paginas) * 100) if total_paginas else 0
            return {
                'id': item.livro_id,
                'titulo': item.livro.titulo,
                'autor': item.livro.autor,
                'capa': request.build_absolute_uri(item.livro.capa.url) if item.livro.capa else None,
                'em_andamento': em_andamento,
                'pagina_atual': item.pagina_atual,
                'total_paginas': total_paginas,
                'progresso_percentual': min(100, progresso),
                'link': f'/leitura/{item.livro_id}' if em_andamento else f'/livro/{item.livro_id}',
            }

        return Response({
            'leitura_destaque': serializar_leitura(
                leitura_atual or ultima_concluida,
                leitura_atual is not None,
            ),
            'metricas': {
                'tempo_medio_sessao_segundos': tempo_medio_segundos,
                'sessoes_consideradas': len(duracoes),
                'generos_explorados': len(generos),
                'avaliacoes_feitas': avaliacoes_feitas,
                'postagens_relevantes': total_postagens_relevantes,
            },
            'generos': [
                {'nome': genero['livro__categoria__nome'], 'total': genero['total']}
                for genero in generos[:6]
            ],
            'postagens_relevantes': [
                {
                    'id': postagem.id,
                    'titulo': postagem.titulo,
                    'comunidade_id': postagem.comunidade_id,
                    'comunidade': postagem.comunidade.nome,
                    'respostas': postagem.respostas_outros,
                    'participantes': postagem.participantes_outros,
                    'criado_em': postagem.criado_em,
                    'link': f'/comunidade/{postagem.comunidade_id}/conteudo',
                }
                for postagem in postagens_relevantes
            ],
            'criterios': {
                'tempo_medio': 'Média das últimas 30 sessões, limitada a 8 horas por sessão.',
                'relevancia': 'Somente respostas publicadas por outras pessoas são consideradas.',
            },
        })


class InicioPersonalizadoAPIView(APIView):
    """Próximas ações privadas da Home, adaptadas ao papel autenticado."""

    permission_classes = [IsAuthenticated]
    TOTAL_DESCOBERTAS = 3

    def get(self, request, *args, **kwargs):
        usuario = obter_ou_criar_usuario_customizado(request.user)
        itens = Biblioteca.objects.filter(user=request.user)
        livros_na_estante = itens.values_list('livro_id', flat=True)
        categorias_preferidas = list(
            itens.exclude(livro__categoria_id__isnull=True)
            .values('livro__categoria_id', 'livro__categoria__nome')
            .annotate(total=Count('id'))
            .order_by('-total', 'livro__categoria__nome')[:3]
        )
        categorias_ids = [item['livro__categoria_id'] for item in categorias_preferidas]

        disponiveis = Livro.objects.filter(status='publicado').exclude(id__in=livros_na_estante)
        selecionados = []
        if categorias_ids:
            selecionados.extend(
                disponiveis.filter(categoria_id__in=categorias_ids)
                .select_related('categoria')
                .order_by('-avaliacao', '-id')[:self.TOTAL_DESCOBERTAS]
            )
        if len(selecionados) < self.TOTAL_DESCOBERTAS:
            ids_selecionados = [livro.id for livro in selecionados]
            selecionados.extend(
                disponiveis.exclude(id__in=ids_selecionados)
                .select_related('categoria')
                .order_by('-avaliacao', '-id')[:self.TOTAL_DESCOBERTAS - len(selecionados)]
            )

        def serializar_livro(livro):
            categoria_preferida = livro.categoria_id in categorias_ids
            return {
                'id': livro.id,
                'titulo': livro.titulo,
                'autor': livro.autor,
                'categoria': livro.categoria.nome,
                'capa': request.build_absolute_uri(livro.capa.url) if livro.capa else None,
                'motivo': (
                    f'Porque {livro.categoria.nome} aparece na sua estante.'
                    if categoria_preferida
                    else 'Destaque disponível no acervo independente.'
                ),
                'link': f'/livro/{livro.id}',
            }

        proxima_acao = self._proxima_acao(request.user, usuario.tipo)
        return Response({
            'papel': usuario.tipo,
            'descobertas': [serializar_livro(livro) for livro in selecionados],
            'criterio_descobertas': (
                'Categorias presentes na sua estante, seguidas pelos destaques do acervo.'
                if categorias_ids
                else 'Destaques do acervo enquanto conhecemos melhor seus interesses.'
            ),
            'proxima_acao': proxima_acao,
        })

    def _proxima_acao(self, user, tipo):
        if tipo == 'admin':
            publicacoes = SolicitacaoPublicacao.objects.filter(status='pendente').count()
            autores = Usuario.objects.filter(tipo='aguardando_aprovacao').count()
            denuncias = (
                Denuncia.objects.filter(status='pendente', arquivada=False).count()
                + DenunciaComunidade.objects.filter(status='pendente').count()
            )
            total = publicacoes + autores + denuncias
            return {
                'tipo': 'administracao',
                'rotulo': 'Operação da plataforma',
                'titulo': 'A Central de Comando está pronta',
                'descricao': (
                    f'{total} {"item aguarda" if total == 1 else "itens aguardam"} atenção nas filas administrativas.'
                    if total else 'Não há pendências nas filas administrativas agora.'
                ),
                'destaque': total,
                'link': '/dashboard',
                'cta': 'Abrir Central de Comando',
            }

        if tipo == 'aguardando_aprovacao':
            return {
                'tipo': 'autoria_em_analise',
                'rotulo': 'Caminho de autor',
                'titulo': 'Sua solicitação está em análise',
                'descricao': 'A equipe administrativa avaliará seu pedido antes de liberar o envio de obras.',
                'link': '/perfil',
                'cta': 'Acompanhar no perfil',
            }

        if tipo == 'autor':
            solicitacao = (
                SolicitacaoPublicacao.objects.filter(usuario=user)
                .select_related('livro')
                .order_by('-data_envio')
                .first()
            )
            if solicitacao is None:
                return {
                    'tipo': 'publicacao',
                    'rotulo': 'Espaço do autor',
                    'titulo': 'Sua primeira obra pode começar aqui',
                    'descricao': 'Envie o manuscrito quando estiver pronto para passar pela moderação editorial.',
                    'link': '/publicar',
                    'cta': 'Enviar primeira obra',
                }

            status_textos = {
                'pendente': ('está em análise', 'Acompanhar no perfil', '/perfil'),
                'aprovado': ('foi aprovada', 'Ver obra publicada', f'/livro/{solicitacao.livro_id}'),
                'rejeitado': ('precisa de uma nova revisão', 'Consultar meu perfil', '/perfil'),
            }
            situacao, cta, link = status_textos[solicitacao.status]
            descricao = f'“{solicitacao.livro.titulo}” {situacao}.'
            if solicitacao.status == 'rejeitado' and solicitacao.observacao_admin:
                descricao = f'{descricao} A orientação da moderação está disponível para você.'
            return {
                'tipo': 'publicacao',
                'rotulo': 'Sua obra em movimento',
                'titulo': solicitacao.livro.titulo,
                'descricao': descricao,
                'status': solicitacao.status,
                'link': link,
                'cta': cta,
            }

        notificacao = (
            Notificacao.objects.filter(usuario=user, tipo='COMUNIDADE', lida=False)
            .order_by('-data_criacao')
            .first()
        )
        if notificacao:
            return {
                'tipo': 'comunidade',
                'rotulo': 'Continue a conversa',
                'titulo': notificacao.titulo,
                'descricao': notificacao.mensagem,
                'link': notificacao.link if notificacao.link and notificacao.link.startswith('/') else '/notificacoes',
                'cta': 'Ver conversa',
            }

        comunidade = Comunidade.objects.filter(
            membros=user, em_manutencao=False,
        ).order_by('-data_criacao').first()
        if comunidade:
            return {
                'tipo': 'comunidade',
                'rotulo': 'Sua comunidade',
                'titulo': comunidade.nome,
                'descricao': comunidade.descricao,
                'link': f'/comunidade/{comunidade.id}/conteudo',
                'cta': 'Entrar na conversa',
            }

        return {
            'tipo': 'comunidade',
            'rotulo': 'Encontre sua comunidade',
            'titulo': 'Há conversas esperando por você',
            'descricao': 'Explore espaços literários e participe dos temas que combinam com suas leituras.',
            'link': '/comunidades',
            'cta': 'Explorar comunidades',
        }


class PerfilPublicoAPIView(APIView):
    permission_classes = [AllowAny]

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

        nascimento = interpretar_data_nascimento(dados_usuario.data_nascimento)

        def dado_pessoal(valor, exibir_publicamente):
            return valor if is_owner or exibir_publicamente else None

        # Perfis administrativos são uma superfície operacional privativa:
        # somente o proprietário ou outro administrador ParaBook pode acessá-los.
        solicitante_admin = eh_admin_parabook(request.user)
        alvo_admin = dados_usuario.tipo == 'admin' or user_auth_obj.is_superuser
        if not is_owner and not solicitante_admin:
            if alvo_admin:
                return Response({"erro": "Acesso negado a perfis administrativos.", "status_block": "admin"}, status=403)
            if perfil_do_usuario.perfil_privado:
                return Response({"erro": "Este perfil é privado.", "status_block": "privado"}, status=403)

        tipo_publico = (
            'leitor'
            if dados_usuario.tipo == 'aguardando_aprovacao'
            else dados_usuario.tipo
        )
        usuario_publico = {
            "username": user_auth_obj.username,
            "nome": dados_usuario.nome,
            "tipo": tipo_publico,
        }
        if alvo_admin and solicitante_admin:
            usuario_publico["permissoes"] = {
                "is_staff": user_auth_obj.is_staff,
                "is_superuser": user_auth_obj.is_superuser,
            }

        perfil_basico = {
            "foto": request.build_absolute_uri(perfil_do_usuario.foto.url) if perfil_do_usuario.foto else None,
            "capa": request.build_absolute_uri(perfil_do_usuario.capa.url) if perfil_do_usuario.capa else None,
            "bio": perfil_do_usuario.bio,
            "descricao_perfil": perfil_do_usuario.descricao_perfil,
            "localizacao": perfil_do_usuario.localizacao,
        }

        # Fora da sessão, o perfil funciona como cartão de apresentação. Dados
        # literários, comunidades e estatísticas exigem uma conta autenticada.
        if not request.user.is_authenticated:
            return Response({
                "is_owner": False,
                "acesso": {"autenticado": False, "nivel": "basico"},
                "usuario": usuario_publico,
                "perfil": perfil_basico,
            })

        meus_livros = (
            Biblioteca.objects.filter(
                user=user_auth_obj,
                livro__status='publicado',
                livro__data_remocao__isnull=True,
            )
            .select_related('livro', 'livro__categoria')
        )
        qnt_livros_lidos = meus_livros.filter(status='lido').count()
        lidos_ano = meus_livros.filter(
            status='lido',
            data_conclusao__year=timezone.localdate().year,
        ).count()
        qnt_lendo_agora = meus_livros.filter(status='lendo').count()
        qnt_avaliados = meus_livros.filter(nota__isnull=False).count()

        minhas_comunidades = Comunidade.objects.filter(
            membros=user_auth_obj,
            em_manutencao=False,
        )
        qnt_comunidades = minhas_comunidades.count()

        top_generos = list(
            meus_livros.values('livro__categoria__nome')
            .annotate(total=Count('livro__categoria__nome'))
            .order_by('-total', 'livro__categoria__nome')[:3]
        )
        lista_generos_favoritos = [item['livro__categoria__nome'] for item in top_generos if item['livro__categoria__nome']]

        top_autores = meus_livros.values('livro__autor').annotate(total=Count('livro__autor')).order_by('-total')[:3]
        lista_autores_favoritos = [item['livro__autor'] for item in top_autores if item['livro__autor']]

        ultimo_lido = meus_livros.filter(status='lido').order_by('-data_conclusao', '-id').first()
        leitura_em_andamento = meus_livros.filter(status='lendo').select_related('livro').order_by('-ultima_leitura_em', '-data_adicao').first()
        historico_livros = meus_livros.filter(status='lido').order_by('-data_conclusao', '-id')[:10]

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

        obras_autor = []
        if dados_usuario.tipo == 'autor':
            obras_autor = list(
                Livro.objects.filter(
                    solicitacao_publicacao__usuario=user_auth_obj,
                    solicitacao_publicacao__status='aprovado',
                    status='publicado',
                    data_remocao__isnull=True,
                )
                .select_related('categoria')
                .order_by('-avaliacao', '-id')
            )

        recomendacao = None
        if dados_usuario.tipo == 'autor':
            livro_recomendado = obras_autor[0] if obras_autor else None
            if livro_recomendado:
                recomendacao = {
                    'id': livro_recomendado.id,
                    'titulo': livro_recomendado.titulo,
                    'autor': livro_recomendado.autor,
                    'tipo': 'autor',
                    'rotulo': 'Recomendação do Autor',
                    'criterio': 'Obra própria publicada em destaque',
                    'nota': float(livro_recomendado.avaliacao),
                    'capa': request.build_absolute_uri(livro_recomendado.capa.url) if livro_recomendado.capa else None,
                }
        elif tipo_publico == 'leitor':
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
                    'capa': request.build_absolute_uri(item_recomendado.livro.capa.url) if item_recomendado.livro.capa else None,
                }

        comunidades_em_comum = list(
            Comunidade.objects.filter(
                membros=user_auth_obj,
                em_manutencao=False,
            )
            .filter(membros=request.user)
            .values_list('id', flat=True)
            .distinct()
        )

        resposta = {
            "is_owner": is_owner,
            "acesso": {"autenticado": True, "nivel": "completo"},
            "usuario": usuario_publico,
            "perfil": {
                **perfil_basico,
                "historico_txt": perfil_do_usuario.historico,
                "meta_leitura_anual": perfil_do_usuario.meta_leitura_anual,
            },
            "dados_pessoais": {
                # O titular sempre recebe seus próprios dados. Para qualquer
                # terceiro, inclusive administradores, o valor privado nunca
                # integra a resposta da API.
                "idade": dado_pessoal(
                    calcular_idade(dados_usuario.data_nascimento),
                    perfil_do_usuario.exibir_idade,
                ),
                "data_nascimento": dado_pessoal(
                    nascimento.isoformat() if nascimento else None,
                    perfil_do_usuario.exibir_data_nascimento,
                ),
                "email": dado_pessoal(
                    user_auth_obj.email or None,
                    perfil_do_usuario.exibir_email,
                ),
                "exibir_idade": perfil_do_usuario.exibir_idade,
                "exibir_data_nascimento": perfil_do_usuario.exibir_data_nascimento,
                "exibir_email": perfil_do_usuario.exibir_email,
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
                {
                    "id": h.id,
                    "livro_id": h.livro_id,
                    "titulo": h.livro.titulo,
                    "autor": h.livro.autor,
                    "capa": request.build_absolute_uri(h.livro.capa.url) if h.livro.capa else None,
                    "nota": h.nota,
                    "data": h.data_conclusao.isoformat() if h.data_conclusao else None,
                }
                for h in historico_livros
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
            "comunidades_em_comum": comunidades_em_comum,
        }
        if dados_usuario.tipo == 'autor':
            resposta["obras"] = [
                {
                    "id": livro.id,
                    "titulo": livro.titulo,
                    "categoria": livro.categoria.nome,
                    "paginas": livro.paginas,
                    "capa": request.build_absolute_uri(livro.capa.url) if livro.capa else None,
                    "avaliacao": float(livro.avaliacao),
                }
                for livro in obras_autor
            ]

        return Response(resposta)

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
