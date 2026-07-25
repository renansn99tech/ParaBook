from functools import wraps
from django.contrib import messages
from django.shortcuts import redirect
from .utils import usuario_eh_premium

def requer_premium(view_func):
    @wraps(view_func)
    def _wrapped_view(request, *args, **kwargs):
        if not usuario_eh_premium(request.user):
            messages.error(request, "Este recurso é exclusivo para assinantes Premium.")
            return redirect('assinaturas:listar_planos')
        return view_func(request, *args, **kwargs)
    return _wrapped_view