from django.db import connection
from django.http import JsonResponse
from django.views.decorators.cache import never_cache


def midia_publica(request, path, document_root=None, **kwargs):
    """No desenvolvimento, PDFs só são entregues pelos serviços autorizados."""
    from pathlib import PurePosixPath
    from django.http import Http404
    from django.views.static import serve
    caminho = PurePosixPath(path)
    if (not caminho.parts or caminho.parts[0] in {'livros', 'quarentena'}
            or caminho.suffix.lower() not in {'.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif'}):
        raise Http404('Mídia privada exige acesso autorizado.')
    return serve(request, path, document_root=document_root, **kwargs)


@never_cache
def health(request):
    """Liveness sem dependências externas."""
    return JsonResponse({'status': 'ok', 'service': 'parabook-api'})


@never_cache
def readiness(request):
    """Readiness verifica a dependência crítica: PostgreSQL."""
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
            cursor.fetchone()
    except Exception:
        return JsonResponse({'status': 'unavailable'}, status=503)
    return JsonResponse({'status': 'ready'})
