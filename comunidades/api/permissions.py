from rest_framework import permissions


class IsCriadorOuAdmin(permissions.BasePermission):
    """
    Equivalente da REGRA 11 das views legadas: leitura é pública, mas editar
    ou excluir uma comunidade é privilégio do criador (ou de um superusuário).

    Sem isso, qualquer usuário autenticado conseguiria dar PUT/DELETE em
    qualquer comunidade via chamada direta à API.
    """

    message = "Você não tem permissão para alterar esta comunidade."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True
        return obj.criador_id == request.user.id or request.user.is_superuser


class IsAutorDaPostagemOuAdmin(permissions.BasePermission):
    """
    Mesma trava para as postagens: só o autor edita; autor ou moderação exclui.
    Espelha `editar_postagem` e `excluir_postagem` das views legadas.
    """

    message = "Você não tem permissão para alterar esta publicação."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        e_moderacao = request.user.is_staff or request.user.is_superuser

        # Exclusão: autor ou moderação. Edição: apenas o autor.
        if request.method == 'DELETE':
            return obj.autor_id == request.user.id or e_moderacao

        return obj.autor_id == request.user.id
