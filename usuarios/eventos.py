"""Schemas N09B para metadados novos; históricos permanecem intactos."""
from uuid import UUID

PAPEIS = {'leitor', 'aguardando_aprovacao', 'autor', 'moderador', 'admin'}
SCHEMA_VERSION = 'g5-v1'
CATEGORIAS = {'conta', 'idade', 'privacidade', 'seguranca', 'conduta', 'outro', 'publicacao', 'comunidade', 'suporte'}


def inteiro(valor):
    return type(valor) is int and 0 <= valor <= 2**63 - 1


def protocolo(valor):
    try:
        return isinstance(valor, str) and str(UUID(valor)) == valor
    except (ValueError, TypeError):
        return False


def enum(valores):
    return lambda valor: isinstance(valor, str) and valor in valores


def booleano(valor):
    return type(valor) is bool


GOVERNANCA = {
    'suspensao_aplicada': {'duracao_dias': enum({3, 7, 15, 30}), 'categoria': enum(CATEGORIAS)},
    'suspensao_revogada': {'suspensao_id': inteiro, 'protocolo_original': protocolo},
    'suspensao_expirada': {'suspensao_id': inteiro},
    'papel_alterado': {'papel_anterior': enum(PAPEIS), 'papel_novo': enum(PAPEIS),
                      'migracao': enum({'usuarios.0008.admin_para_moderador'})},
}
# Duração é um inteiro estrito, não texto e nem booleano.
GOVERNANCA['suspensao_aplicada']['duracao_dias'] = lambda valor: type(valor) is int and valor in {3, 7, 15, 30}

AUDITORIA = {
    'idade.revisao_decidida': {
        'protocolo': protocolo,
        'acao': enum({'iniciar', 'confirmar_declaracao', 'orientar_correcao'}),
        'estado': enum({'pendente', 'em_revisao', 'restrito_menor', 'liberado_adulto'}),
    },
    'sessao.encerrada': {'quantidade': inteiro},
    'seguranca.2fa_habilitada': {}, 'seguranca.2fa_desabilitada': {},
    'suporte.solicitacao_criada': {'protocolo': protocolo, 'categoria': enum(CATEGORIAS)},
    'suporte.solicitacao_atualizada': {'protocolo': protocolo, 'status': enum({'aberta', 'em_analise', 'respondida', 'encerrada'})},
    'conta.suspensa': {'protocolo': protocolo, 'duracao_dias': GOVERNANCA['suspensao_aplicada']['duracao_dias']},
    'conta.suspensao_revogada': {'protocolo': protocolo},
    'conta.papel_alterado': {'protocolo': protocolo, 'papel_anterior': enum(PAPEIS), 'papel_novo': enum(PAPEIS)},
    'conta.encerrada': {'protocolo': protocolo}, 'conta.excluida': {},
    'lgpd.dados_exportados': {}, 'lgpd.prova_consultada': {'protocolo': protocolo},
    'senha.alterada': {},
    'comunidade.excluida': {'forcada': booleano},
    'comunidade.status_alterado': {'em_manutencao': booleano},
    'django_admin.atalho_aberto': {'origem': enum({'perfil_avancado'})},
    'feature_flag.alterada': {'habilitada': booleano, 'chave': enum({
        'conteudo_demonstrativo', 'banner_anuncios', 'analytics_autor', 'acervo_avancado_beta',
        'perfil_jornada_leitura', 'moderacao_no_perfil', 'autenticacao_2fa',
    })},
}
for acao in ('recebido', 'origem_vinculada', 'complemento_recebido', 'recurso_recebido',
             'assumir', 'triagem', 'confirmar', 'complemento', 'decidir', 'comunicar', 'encerrar',
             'recurso_decidir', 'conselho_solicitar', 'conselho_aprovar', 'conselho_executar', 'conselho_cancelar'):
    AUDITORIA[f'moderacao.caso.{acao}'] = {
        'protocolo': protocolo, 'prioridade': enum({'', 'P0', 'P1', 'P2'}),
        'estado': enum({'aguarda_triagem', 'em_analise', 'aguarda_complemento', 'decidido', 'encerrado'}),
    }

for categoria in ('usuario', 'autor', 'livro', 'comunidade'):
    for acao in ('aprovar', 'rejeitar', 'excluir', 'restaurar', 'suspender', 'reativar'):
        AUDITORIA[f'moderacao.{categoria}.{acao}'] = {'observacao_informada': booleano}
for acao in ('enviada', 'retirada', 'correcao_simples', 'revisao_enviada', 'aprovada', 'rejeitada',
             'acervo_cadastrado', 'acervo_editado',
             'direitos_conferidos', 'direitos_revogada', 'direitos_disputa', 'direitos_expirados',
             'denuncia_recebida', 'denuncia_acolhida', 'denuncia_arquivada', 'denuncia_reaberta',
             'suspensa', 'restaurada', 'recurso_recebido', 'recurso_acolhido', 'recurso_recusado'):
    AUDITORIA[f'publicacao.{acao}'] = {
        'evento_id': inteiro,
        'anterior': enum({'', 'pendente', 'publicado', 'rejeitado', 'removido', 'suspenso', 'retirado', 'manutencao', 'expirado'}),
        'posterior': enum({'pendente', 'publicado', 'rejeitado', 'removido', 'suspenso', 'retirado', 'manutencao', 'expirado'}),
    }


def filtrar_metadados(schemas, evento, dados):
    schema = schemas.get(evento)
    if schema is None:
        raise ValueError('Evento sem schema permitido.')
    if type(dados) is not dict:
        dados = {}
    return {'versao_schema': SCHEMA_VERSION, **{
        campo: dados[campo] for campo, validar in schema.items() if campo in dados and validar(dados[campo])
    }}
