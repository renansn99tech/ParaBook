# querysets.py
from .models import Livro


def livros_por_categorias(categorias: list):
    """
    Retorna apenas livros publicados que pertencem às categorias informadas.
    Otimiza a consulta com select_related para evitar o problema de queries N+1.
    """
    return (
        Livro.objects.select_related('categoria')
        .filter(categoria__nome__in=categorias, status='publicado')
        .order_by('-id')
    )


def livros_independentes():
    """
    Retorna os livros enviados por autores independentes que já foram aprovados e publicados.
    Substitui a consulta ao antigo ObraAutor pela estrutura unificada do model Livro.
    """
    return (
        Livro.objects.select_related('categoria')
        .filter(origem='autor_independente', status='publicado')
        .order_by('-id')
    )