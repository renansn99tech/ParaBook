def eh_admin_parabook(user):
<<<<<<< HEAD
    """Valida em conjunto o privilégio Django e o papel de negócio ParaBook."""
=======
    """Valida o superusuário ou o moderador operacional do ParaBook.

    ``admin`` não-superusuário permanece aceito por uma versão de observação
    para que tokens e registros anteriores à migração não percam acesso no
    meio de uma decisão. Novas contas operacionais usam ``moderador``.
    """
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9

    if not user or not user.is_authenticated:
        return False
    if user.is_superuser:
        return True
    perfil_customizado = getattr(user, 'perfil_customizado', None)
    return bool(
        user.is_staff
        and perfil_customizado
<<<<<<< HEAD
        and perfil_customizado.tipo == 'admin'
=======
        and perfil_customizado.tipo in {'moderador', 'admin'}
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9
    )
