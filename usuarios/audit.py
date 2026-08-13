import logging

from usuarios.models import AuditoriaAcao

logger = logging.getLogger(__name__)


def registrar_acao(*, ator, acao, recurso, recurso_id='', sucesso=True, metadados=None):
    """Auditoria não deve derrubar a operação principal nem receber segredos/PII."""
    try:
        return AuditoriaAcao.objects.create(
            ator=ator if getattr(ator, 'is_authenticated', False) else None,
            acao=acao,
            recurso=recurso,
            recurso_id=str(recurso_id),
            sucesso=sucesso,
            metadados=metadados or {},
        )
    except Exception:
        logger.exception('Falha ao registrar auditoria da ação %s', acao)
        return None
