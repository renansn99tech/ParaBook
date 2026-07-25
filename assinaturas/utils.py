def usuario_eh_premium(user):
    """
    Retorna True se o usuário estiver autenticado e possuir uma assinatura ativa.
    """
    if not user or not user.is_authenticated:
        return False
    try:
        return user.assinatura.ativa
    except (AttributeError, Exception):
        # Caso o usuário não possua o objeto Assinatura vinculado
        return False