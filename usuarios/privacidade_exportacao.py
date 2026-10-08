"""Acesso do titular: seleção explícita de campos, sempre limitada ao usuário.

JSON entregue diretamente na sessão autenticada, sem arquivo temporário,
URLs de Storage, tokens ou exportação geral de banco/log.
"""
from django.utils import timezone

from assinaturas.models import Assinatura
from biblioteca.models import (
    Biblioteca, DeclaracaoAutoria, Denuncia, EventoLeitura, Livro, Perfil as PerfilLegado,
    RecursoPublicacao, SolicitacaoPublicacao, TentativaPublicacao,
)
from comunidades.models import Comunidade, DenunciaComunidade, PostagemComunidade, RespostaPostagem
from gamificacao.models import ConquistaUsuario, ProgressoLeitor
from notificacoes.models import Notificacao
from perfis.models import Perfil
from usuarios.models import (
    AuditoriaAcao, AutenticacaoDoisFatores, EstadoEtarioConta, EventoEtarioConta,
    EventoGovernancaConta, Notificacao as NotificacaoLegada, SessaoDispositivo,
    SolicitacaoSuporte, SuspensaoConta, Usuario,
)
from usuarios.privacidade_provas import ler_prova
from rest_framework.exceptions import APIException


def registros(queryset, *campos):
    return list(queryset.order_by('pk').values(*campos))


def exportar_dados(usuario):
    custom = Usuario.objects.filter(user_auth=usuario)
    perfis = Perfil.objects.filter(usuario=usuario)
    perfis_legados = PerfilLegado.objects.filter(user=usuario)
    solicitacoes = SolicitacaoPublicacao.objects.filter(usuario=usuario)
    obras = Livro.objects.filter(solicitacao_publicacao__usuario=usuario)
    filtros = [
        'Senhas derivadas, credenciais, tokens, identificadores de renovação e segredos 2FA não integram a entrega.',
        'Textos restritos de moderação e identidade de denunciantes exigem análise assistida por protocolo.',
        'Arquivos próprios constam no manifesto; cópia/acesso é conferido no atendimento. Obras de terceiros não são copiadas.',
        'Gmail, cópias e logs de infraestrutura exigem consulta assistida; a consulta ao banco não comprova ausência nesses destinos.',
    ]
    conta = {
        'id': usuario.pk, 'username': usuario.username, 'email': usuario.email,
        'primeiro_nome': usuario.first_name, 'sobrenome': usuario.last_name,
        'criado_em': usuario.date_joined, 'ultimo_acesso': usuario.last_login,
        'cadastro': registros(custom, 'nome', 'tipo', 'cpf', 'telefone', 'data_nascimento',
            'data_nascimento_eligibilidade', 'foto', 'descricao', 'conquistas',
            'termos_aceitos', 'data_aceite_termos', 'versao_termos_aceita',
            'notificacoes_email', 'notificacoes_comunidades', 'notificacoes_assinaturas', 'onboarding_lembretes'),
    }
    categorias = {
        'T01': conta,
        'T02': {
            'sessoes': registros(SessaoDispositivo.objects.filter(usuario=usuario),
                'id', 'criada_em', 'ultima_atividade_em', 'expira_em', 'revogada_em'),
            'dois_fatores': registros(AutenticacaoDoisFatores.objects.filter(usuario=usuario), 'habilitada', 'criada_em', 'atualizada_em'),
        },
        'T03': {
            'estado': registros(EstadoEtarioConta.objects.filter(usuario=usuario),
                'estado', 'declaracoes_sucesso', 'proxima_correcao_permitida_em', 'versao_politica', 'atualizado_em'),
            'eventos': registros(EventoEtarioConta.objects.filter(usuario=usuario), 'protocolo',
                'tipo', 'estado_anterior', 'estado_novo', 'faixa_resultante', 'ordinal_declaracao',
                'proxima_correcao_permitida_em', 'origem', 'versao_politica', 'versao_documentos', 'criado_em'),
        },
        'T04': registros(perfis, 'id', 'historico', 'descricao_perfil', 'bio', 'localizacao',
            'meta_leitura_anual', 'tipografia', 'perfil_privado', 'exibir_email',
            'exibir_idade', 'exibir_data_nascimento', 'exibir_aniversario_sem_ano'),
        'T05': {
            'estante': registros(Biblioteca.objects.filter(user=usuario), 'livro_id',
                'livro__titulo', 'status', 'favorito', 'nota', 'resenha', 'pagina_atual',
                'data_adicao', 'data_conclusao', 'favoritado_em', 'ultima_leitura_em', 'avaliada_em'),
            'eventos': registros(EventoLeitura.objects.filter(usuario=usuario), 'livro_id',
                'pagina', 'percentual', 'duracao_segundos', 'origem', 'criado_em'),
        },
        'T06': {
            'progresso': registros(ProgressoLeitor.objects.filter(user=usuario),
                'pontos_xp', 'nivel', 'dias_seguidos', 'ultima_atividade'),
            'conquistas': registros(ConquistaUsuario.objects.filter(user=usuario),
                'conquista__slug', 'conquista__nome', 'data_desbloqueio'),
        },
        'T07': {
            'adesoes': registros(Comunidade.objects.filter(membros=usuario), 'id', 'nome'),
            'criadas': registros(Comunidade.objects.filter(criador=usuario), 'id', 'nome', 'descricao', 'data_criacao'),
            'postagens': registros(PostagemComunidade.objects.filter(autor=usuario),
                'id', 'comunidade_id', 'titulo', 'conteudo', 'criado_em', 'atualizado_em'),
            'respostas': registros(RespostaPostagem.objects.filter(autor=usuario),
                'id', 'postagem_id', 'conteudo', 'criado_em', 'atualizado_em'),
        },
        'T08': {
            'obras': registros(obras, 'id', 'titulo', 'autor', 'status', 'origem', 'modelo_acesso', 'retirado_em'),
            'solicitacoes': registros(solicitacoes, 'id', 'livro_id', 'status', 'data_envio', 'data_analise'),
            'declaracoes': registros(DeclaracaoAutoria.objects.filter(solicitacao__in=solicitacoes),
                'solicitacao_id', 'cpf_final', 'registro_autoral', 'numero_registro', 'versao_termos', 'declarado_em'),
            'tentativas': registros(TentativaPublicacao.objects.filter(solicitacao__in=solicitacoes),
                'id', 'solicitacao_id', 'status', 'criada_em', 'analisada_em'),
            'recursos': registros(RecursoPublicacao.objects.filter(autor=usuario),
                'id', 'evento_id', 'fundamento', 'status', 'criado_em', 'decidido_em'),
        },
        'T09': {
            'governanca': registros(EventoGovernancaConta.objects.filter(usuario=usuario), 'protocolo', 'tipo', 'criado_em'),
            'suspensoes': registros(SuspensaoConta.objects.filter(usuario=usuario),
                'protocolo', 'status', 'duracao_dias', 'inicia_em', 'termina_em', 'revogada_em'),
            'denuncias_obras_proprias': registros(Denuncia.objects.filter(usuario=usuario),
                'protocolo', 'livro_id', 'motivo', 'status', 'data_denuncia', 'data_arquivamento'),
            'denuncias_comunidades_proprias': registros(DenunciaComunidade.objects.filter(usuario=usuario),
                'id', 'comunidade_id', 'motivo', 'status', 'data_denuncia', 'data_analise'),
            'auditoria': registros(AuditoriaAcao.objects.filter(ator=usuario), 'acao', 'recurso', 'sucesso', 'criado_em'),
        },
        'T10': registros(SolicitacaoSuporte.objects.filter(usuario=usuario),
            'protocolo', 'categoria', 'assunto', 'mensagem', 'status', 'resposta', 'criada_em', 'atualizada_em'),
        'T11': {
            'canonicas': registros(Notificacao.objects.filter(usuario=usuario), 'titulo', 'mensagem', 'tipo', 'lida', 'data_criacao'),
            'legadas': registros(NotificacaoLegada.objects.filter(usuario=usuario), 'titulo', 'mensagem', 'tipo', 'lida', 'data_criacao'),
        },
        'T12': registros(Assinatura.objects.filter(usuario=usuario), 'plano__nome', 'ativa', 'data_inicio', 'data_fim'),
        'T13': {'estado': 'consulta_assistida', 'destinos': ['banco', 'storage', 'logs', 'gmail', 'copias'], 'consulta_automatica_externa': False},
    }
    from django.db.models import Q
    from usuarios.moderacao import dados_publicos
    from usuarios.models_moderacao import CasoModeracao
    categorias['T09']['casos_moderacao_proprios'] = [dados_publicos(caso) for caso in
        CasoModeracao.objects.filter(Q(usuario=usuario) | Q(alvo_usuario=usuario)).order_by('pk')]
    declaracoes = []
    categorias['T04'] = {'canonico': categorias['T04'],
                         'legado_somente_leitura': registros(perfis_legados, 'id', 'bio', 'localizacao', 'status')}
    impedimentos_provas = []
    for prova in usuario.provas_privacidade.filter(classe='R10'):
        try:
            declaracoes.append(ler_prova(prova=prova, ator=usuario))
        except APIException:
            impedimentos_provas.append({'protocolo': str(prova.protocolo), 'estado': 'consulta_assistida'})
    categorias['T03']['declaracoes_segregadas'] = declaracoes
    categorias['T03']['impedimentos_provas'] = impedimentos_provas
    manifesto = []
    for queryset, campos, tipo in (
        (perfis, ('foto', 'capa'), 'perfil'),
        (perfis_legados, ('foto',), 'perfil_legado'),
        (PostagemComunidade.objects.filter(autor=usuario), ('imagem',), 'postagem'),
        (obras, ('pdf', 'pdf_amostra', 'capa'), 'obra'),
        (TentativaPublicacao.objects.filter(solicitacao__in=solicitacoes), ('pdf', 'pdf_amostra', 'capa'), 'tentativa'),
    ):
        for registro in queryset:
            for campo in campos:
                if getattr(registro, campo):
                    manifesto.append({'tipo': tipo, 'recurso_id': registro.pk, 'campo': campo,
                        'estado': 'referencia_localizada', 'acesso': 'atendimento_assistido_com_permissao_conferida'})
    cobertura = []
    for codigo, conteudo in categorias.items():
        tem_registro = bool(conteudo)
        if isinstance(conteudo, dict) and codigo not in {'T01', 'T13'}:
            tem_registro = any(bool(valor) for valor in conteudo.values())
        estado = 'disponivel' if tem_registro else 'sem_registro_no_banco_consultado'
        if codigo in {'T03', 'T08', 'T09', 'T13'}:
            estado = 'parcial_consulta_assistida'
        cobertura.append({'categoria': codigo, 'estado': estado})
    return {
        'versao_schema': 'g5-v1', 'exportado_em': timezone.now(),
        'resumo_legivel': 'Dados próprios localizados no banco ParaBook, organizados em T01–T13. '
            'Consulte a cobertura e os filtros; itens parciais e arquivos próprios podem ser solicitados no atendimento de privacidade.',
        'cobertura': cobertura, 'categorias': categorias, 'arquivos_proprios': manifesto, 'filtros': filtros,
        'entrega': {'meio': 'sessao_autenticada', 'arquivo_temporario_servidor': False},
    }
