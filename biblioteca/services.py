from .models import Livro
from .constants import Categorias


def livros_por_categoria(nome_categoria: str):
    return Livro.objects.filter(categoria__nome__iexact=nome_categoria)