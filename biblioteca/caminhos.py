from uuid import uuid4
from django.conf import settings


def pdf_livro(instance, filename):
    return f'livros/quarentena/{uuid4()}.pdf' if settings.BOOK_FILE_SCAN_REQUIRED else f'livros/{filename}'


def pdf_amostra(instance, filename):
    return f'livros/quarentena/amostras/{uuid4()}.pdf' if settings.BOOK_FILE_SCAN_REQUIRED else f'livros/amostras/{filename}'


def pdf_revisao(instance, filename):
    return f'livros/quarentena/revisoes/{uuid4()}.pdf' if settings.BOOK_FILE_SCAN_REQUIRED else f'livros/revisoes/{filename}'
