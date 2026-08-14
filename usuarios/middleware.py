from django.shortcuts import redirect
from django.urls import reverse
from django.conf import settings

class ForcarAceiteTermosMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Rotas isentas para evitar loop infinito de redirecionamento
            rotas_isentas = [
                reverse('usuarios:aceitar_termos'), 
                reverse('logout'),
                reverse('diretrizes'),
                reverse('api_aceitar_termos'),
                reverse('api_logout'),
                reverse('governanca_legal'),
            ]
            
            if request.path not in rotas_isentas:
                try:
                    # Se o usuário não aceitou, trava a navegação
                    usuario_custom = request.user.perfil_customizado
                    if (
                        not usuario_custom.termos_aceitos
                        or usuario_custom.versao_termos_aceita != settings.TERMS_VERSION
                    ):
                        return redirect('usuarios:aceitar_termos')
                except AttributeError:
                    pass
                    
        return self.get_response(request)
