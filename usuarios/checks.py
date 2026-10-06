from django.conf import settings
from django.core.checks import Error, register
from django.core.exceptions import ImproperlyConfigured


@register()
def verificar_configuracao_etaria(app_configs, **kwargs):
    if not settings.AGE_POLICY_ACTIVE:
        return []
    from .idade import politica_esta_ativa
    try:
        politica_esta_ativa()
    except ImproperlyConfigured as exc:
        return [Error(str(exc), id='usuarios.E001')]
    return []
