from django.contrib import admin
from biblioteca.models import Denuncia, EventoLeitura

# Register your models here.

@admin.register(Denuncia)
class DenunciaAdmin(admin.ModelAdmin):
    list_display = ('livro', 'motivo', 'usuario', 'data_denuncia', 'status')
    list_filter = ('status', 'motivo')
    search_fields = ('livro__nome', 'usuario__username')


@admin.register(EventoLeitura)
class EventoLeituraAdmin(admin.ModelAdmin):
    list_display = ('livro', 'usuario', 'sessao_id', 'pagina', 'percentual', 'origem', 'criado_em')
    list_filter = ('origem', 'criado_em')
    search_fields = ('livro__titulo', 'usuario__username', 'sessao_id')
    readonly_fields = ('livro', 'usuario', 'sessao_id', 'pagina', 'percentual', 'duracao_segundos', 'origem', 'criado_em')

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
