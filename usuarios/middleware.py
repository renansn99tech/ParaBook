from django.shortcuts import redirect
from django.urls import reverse

class ForcarAceiteTermosMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.user.is_authenticated:
            # Rotas isentas para evitar loop infinito de redirecionamento
            rotas_isentas = [
                reverse('usuarios:aceitar_termos'), 
                reverse('logout'),
                reverse('diretrizes')
            ]
            
            if request.path not in rotas_isentas:
                try:
                    # Se o usuário não aceitou, trava a navegação
                    usuario_custom = request.user.perfil_customizado
                    if not usuario_custom.termos_aceitos:
                        return redirect('usuarios:aceitar_termos')
                except:
                    pass
                    
        return self.get_response(request)