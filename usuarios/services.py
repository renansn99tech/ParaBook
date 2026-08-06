from perfis.models import Perfil
from .models import Usuario


def obter_ou_criar_usuario_customizado(user_auth):
    """Garante que um User autenticado tenha um Usuario+Perfil vinculados.

    Contas criadas fora do registro normal (ex: createsuperuser) nao
    passam por usuarios.views.register e ficam sem essa ligacao.
    """
    try:
        return Usuario.objects.get(user_auth=user_auth)
    except Usuario.DoesNotExist:
        is_admin = user_auth.is_superuser
        perfil = Perfil.objects.create(
            descricao_perfil="Administrador do Sistema" if is_admin else "Novo Leitor"
        )
        return Usuario.objects.create(
            user_auth=user_auth,
            nome="Super User" if is_admin else user_auth.username,
            tipo='admin' if is_admin else 'leitor',
            perfil=perfil,
        )