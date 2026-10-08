from django.contrib import admin
from .models import Comunidade, PostagemComunidade


class ConsultaModeracaoAdmin(admin.ModelAdmin):
    """Decisões administrativas usam o rito auditado, também no Django Admin."""
    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


admin.site.register(Comunidade, ConsultaModeracaoAdmin)
admin.site.register(PostagemComunidade, ConsultaModeracaoAdmin)
