from django.contrib import admin
from biblioteca.models import Denuncia

# Register your models here.

@admin.register(Denuncia)
class DenunciaAdmin(admin.ModelAdmin):
    list_display = ('livro', 'motivo', 'usuario', 'data_denuncia', 'status')
    list_filter = ('status', 'motivo')
    search_fields = ('livro__nome', 'usuario__username')