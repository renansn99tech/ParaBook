from django.contrib import admin
from .models import ProgressoLeitor, Conquista, ConquistaUsuario


@admin.register(ProgressoLeitor)
class ProgressoLeitorAdmin(admin.ModelAdmin):
    list_display = ('user', 'nivel', 'pontos_xp', 'dias_seguidos', 'ultima_atividade')
    search_fields = ('user__username', 'user__email')
    list_filter = ('nivel',)
    ordering = ('-pontos_xp',)


@admin.register(Conquista)
class ConquistaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'slug', 'categoria', 'pontos_recompensa', 'icone')
    search_fields = ('nome', 'slug')
    list_filter = ('categoria',)
    prepopulated_fields = {'slug': ('nome',)}


@admin.register(ConquistaUsuario)
class ConquistaUsuarioAdmin(admin.ModelAdmin):
    list_display = ('user', 'conquista', 'data_desbloqueio')
    search_fields = ('user__username', 'conquista__nome')
    list_filter = ('data_desbloqueio', 'conquista__categoria')