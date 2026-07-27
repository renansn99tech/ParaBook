from .utils import usuario_eh_premium


def anuncios_context(request):
    """
    Injeta no contexto global dos templates a variável 'exibir_anuncios'.
    Se o usuário for pagante/premium, 'exibir_anuncios' será False.
    """
    if not request.user.is_authenticated:
        return {'exibir_anuncios': True}

    # Se for premium, NÃO exibe anúncios
    eh_premium = usuario_eh_premium(request.user)
    return {'exibir_anuncios': not eh_premium}