def eh_admin_parabook(user):
    """Valida em conjunto o privilégio Django e o papel de negócio ParaBook."""

    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    perfil_customizado = getattr(user, 'perfil_customizado', None)
    return bool(
        user.is_staff
        and perfil_customizado
        and perfil_customizado.tipo == 'admin'
    )
