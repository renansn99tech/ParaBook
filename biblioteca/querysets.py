from .models import Livro, ObraAutor


def livros_por_categorias(categorias: list):
    return Livro.objects.select_related('categoria').filter(
        categoria__nome__in=categorias
    )


def livros_independentes():
    return ObraAutor.objects.select_related('categoria').filter(
        status='aprovado',
        categoria__nome__iexact='independente'
    )