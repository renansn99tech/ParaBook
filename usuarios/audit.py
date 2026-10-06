import logging

from usuarios.models import AuditoriaAcao
from usuarios.eventos import AUDITORIA, filtrar_metadados
from uuid import UUID

logger = logging.getLogger(__name__)


def registrar_acao(*, ator, acao, recurso, recurso_id='', sucesso=True, metadados=None):
    """Auditoria não deve derrubar a operação principal nem receber segredos/PII."""
    try:
        if recurso not in {'User', 'SessaoDispositivo', 'SolicitacaoSuporte', 'Comunidade', 'Livro', 'Usuario', 'AdminSite', 'FeatureFlag', 'ProvaPrivacidade'}:
            raise ValueError('Recurso sem schema permitido.')
        referencia = ''
        if type(recurso_id) is int and 0 < recurso_id < 2**63:
            referencia = str(recurso_id)
        elif isinstance(recurso_id, str):
            if recurso_id in {'', 'todas'} or (recurso_id.isdecimal() and len(recurso_id) <= 19):
                referencia = recurso_id
            else:
                try:
                    referencia = str(UUID(recurso_id))
                except ValueError:
                    pass
        return AuditoriaAcao.objects.create(
            ator=ator if getattr(ator, 'is_authenticated', False) else None,
            acao=acao,
            recurso=recurso,
            recurso_id=referencia,
            sucesso=sucesso,
            metadados=filtrar_metadados(AUDITORIA, acao, metadados or {}),
        )
    except Exception:
        logger.error('auditoria_falhou', extra={'evento_codigo': 'auditoria_falhou'})
        return None
