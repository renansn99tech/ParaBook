from perfis.models import (
    FRASE_STATUS_PADRAO_AUTOR,
    FRASE_STATUS_PADRAO_LEITOR,
    Perfil,
)


def aplicar_frase_status_padrao_autor(usuario):
    """Troca somente o status automático de leitor ao aprovar uma autoria.

    Uma frase personalizada, inclusive vazia por escolha da pessoa, nunca é
    sobrescrita. O retorno informa se o texto padrão foi efetivamente trocado.
    """
    if usuario.tipo != 'autor' or not usuario.user_auth_id:
        return False

    perfil = usuario.perfil
    if perfil is None:
        perfil, _ = Perfil.objects.get_or_create(usuario=usuario.user_auth)
        usuario.perfil = perfil
        usuario.save(update_fields=['perfil'])

    if (perfil.descricao_perfil or '').strip() != FRASE_STATUS_PADRAO_LEITOR:
        return False

    perfil.descricao_perfil = FRASE_STATUS_PADRAO_AUTOR
    perfil.save(update_fields=['descricao_perfil'])
    return True
