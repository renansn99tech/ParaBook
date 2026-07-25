from django.shortcuts import redirect
from django.contrib import messages
from .utils import usuario_eh_premium

class PremiumRequiredMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/premium/'):
            if not usuario_eh_premium(request.user):
                messages.error(request, "Acesso restrito a assinantes Premium.")
                return redirect('assinaturas:listar_planos')
        return self.get_response(request)