from django.conf import settings
from django.core.exceptions import ValidationError
from pypdf import PdfReader


def validar_pdf_livro(arquivo):
    """Valida tamanho, assinatura, estrutura e criptografia sem confiar na extensão."""
    if arquivo.size > settings.MAX_BOOK_UPLOAD_SIZE:
        max_mb = settings.MAX_BOOK_UPLOAD_SIZE / (1024 * 1024)
        raise ValidationError(
            f'O arquivo excede o limite de {max_mb:.1f} MB.'
        )

    posicao = arquivo.tell()
    try:
        arquivo.seek(0)
        if arquivo.read(5) != b'%PDF-':
            raise ValidationError('O arquivo enviado não é um PDF válido.')
        arquivo.seek(0)
        leitor = PdfReader(arquivo, strict=True)
        if leitor.is_encrypted:
            raise ValidationError('PDFs protegidos por senha não são aceitos.')
        paginas = len(leitor.pages)
        if paginas < 1 or paginas > settings.MAX_BOOK_PAGES:
            raise ValidationError(
                f'O PDF deve ter entre 1 e {settings.MAX_BOOK_PAGES} páginas.'
            )
    except ValidationError:
        raise
    except Exception as exc:
        raise ValidationError('O PDF está corrompido ou malformado.') from exc
    finally:
        arquivo.seek(posicao)
    return arquivo
