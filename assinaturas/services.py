def usuario_eh_premium(user):
    """
    Retorna True se o usuário estiver autenticado e possuir uma assinatura ativa.
    """
    if not user.is_authenticated:
        return False
    try:
        return user.assinatura.ativa
    except AttributeError:
        # Usuário não possui objeto Assinatura vinculado
        return False