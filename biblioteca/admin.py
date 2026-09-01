from django.contrib import admin
from biblioteca.models import Denuncia, EventoLeitura, Livro

# Register your models here.


@admin.register(Livro)
class LivroAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'autor', 'categoria', 'origem', 'modelo_acesso', 'status', 'disponivel_ate')
    list_filter = ('origem', 'modelo_acesso', 'status', 'categoria')
    search_fields = ('titulo', 'autor', 'territorio_cultural')
    readonly_fields = ('data_remocao',)
    fieldsets = (
        ('Dados editoriais', {
            'fields': ('titulo', 'autor', 'categoria', 'ano_publicacao', 'isbn', 'paginas', 'edicao', 'capa'),
        }),
        ('Origem e acesso', {
            'fields': (
                'origem', 'modelo_acesso', 'territorio_cultural',
                'disponivel_de', 'disponivel_ate', 'pdf', 'pdf_amostra',
            ),
        }),
        ('Moderação', {
            'fields': ('status', 'data_remocao', 'avaliacao'),
        }),
    )

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
