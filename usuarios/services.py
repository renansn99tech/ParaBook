from django.contrib.auth import get_user_model
from django.core.exceptions import FieldDoesNotExist

from perfis.models import Perfil
from .models import Usuario


def resolver_identificador_login(identifier):
    """Resolve username/e-mail para o valor esperado pelo USERNAME_FIELD.

    Retorna o identificador original quando não há correspondência por e-mail,
    deixando o backend padrão do Django decidir se a credencial é válida.
    """
    identifier = (identifier or '').strip()
    if not identifier:
        return identifier

    UserModel = get_user_model()
    username_field = UserModel.USERNAME_FIELD
    user = UserModel._default_manager.filter(
        **{f'{username_field}__iexact': identifier}
    ).first()
    if user is not None:
        return getattr(user, username_field)

    email_field = getattr(UserModel, 'EMAIL_FIELD', 'email')
    if email_field == username_field:
        return identifier
    try:
        UserModel._meta.get_field(email_field)
    except FieldDoesNotExist:
        return identifier

    matches = list(
        UserModel._default_manager.filter(
            **{f'{email_field}__iexact': identifier}
        ).order_by('pk')[:2]
    )
    if len(matches) == 1:
        return getattr(matches[0], username_field)
    return identifier


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
