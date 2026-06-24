from django.contrib import admin
from .models import Usuario

@admin.register(Usuario)
class UsuarioAdmin(admin.ModelAdmin):
    list_display = ('nome', 'email', 'tipo')
    list_filter = ('tipo',)
    search_fields = ('nome', 'email')