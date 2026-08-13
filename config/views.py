from django.db import connection
from django.http import JsonResponse
from django.views.decorators.cache import never_cache


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
