from django.contrib import admin
from .models import Plano, Assinatura

@admin.register(Plano)
class PlanoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'preco', 'limite_livros', 'anuncios')

@admin.register(Assinatura)
class AssinaturaAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'plano', 'ativa', 'data_inicio', 'data_fim')
    list_filter = ('ativa', 'plano')
    search_fields = ('usuario__username', 'usuario__email')