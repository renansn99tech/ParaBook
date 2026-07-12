from django.contrib import admin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('nome', 'email_usuario', 'tipo')
    list_filter = ('tipo',)
    search_fields = ('nome', 'user_auth__email')

    def email_usuario(self, obj):
        return obj.user_auth.email if obj.user_auth else "-"

    email_usuario.short_description = "E-mail"