from rest_framework.permissions import BasePermission
from usuarios.permissions import eh_admin_parabook


class IsParaBookAdmin(BasePermission):
    """Exige simultaneamente o papel de negócio e o privilégio Django."""

    message = 'Acesso restrito a administradores da plataforma.'

    def has_permission(self, request, view):
        return eh_admin_parabook(request.user)
