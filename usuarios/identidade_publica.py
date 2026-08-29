from usuarios.permissions import eh_admin_parabook


IDENTIFICADOR_ADMIN_PUBLICO = 'admin'
NOME_ADMIN_PUBLICO = 'Admin ParaBook'


def conta_administrativa(user):
    """Reconhece o papel administrativo sem depender só do Django staff."""
    if not user:
        return False
    perfil_customizado = getattr(user, 'perfil_customizado', None)
    return bool(user.is_superuser or (perfil_customizado and perfil_customizado.tipo == 'admin'))


def identidade_publica(user, viewer=None):
    """Entrega uma identidade segura para superfícies sociais.

    O identificador real de uma conta administrativa só é necessário para o
    próprio titular ou para outra conta administrativa autorizada. Para as
    demais pessoas, a conta é apresentada como @admin e não oferece navegação
    para o perfil.
    """
    alvo_admin = conta_administrativa(user)
    viewer_e_titular = bool(viewer and viewer.is_authenticated and viewer.pk == user.pk)
    viewer_admin = eh_admin_parabook(viewer)
    ocultar_admin = alvo_admin and not viewer_e_titular and not viewer_admin

    if ocultar_admin:
        return {
            'username': IDENTIFICADOR_ADMIN_PUBLICO,
            'nome_exibicao': NOME_ADMIN_PUBLICO,
            'perfil_clicavel': False,
            'tipo': 'admin',
        }

    perfil_customizado = getattr(user, 'perfil_customizado', None)
    return {
        'username': user.username,
        'nome_exibicao': user.get_full_name() or getattr(perfil_customizado, 'nome', None) or user.username,
        'perfil_clicavel': not alvo_admin or viewer_e_titular or viewer_admin,
        'tipo': getattr(perfil_customizado, 'tipo', None) or ('admin' if user.is_superuser else 'leitor'),
    }
