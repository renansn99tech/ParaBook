from decimal import Decimal

from django.utils import timezone


def usuario_eh_premium(user):
    """
    Retorna True somente para assinatura paga, ativa e dentro da vigência.
    """
    if not user or not user.is_authenticated:
        return False
    try:
        assinatura = user.assinatura
        if (
            not assinatura.ativa
            or not assinatura.plano
            or Decimal(str(assinatura.plano.preco)) <= Decimal('0')
        ):
            return False
        return not assinatura.data_fim or assinatura.data_fim > timezone.now()
    except AttributeError:
        return False
