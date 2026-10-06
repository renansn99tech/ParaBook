from django.shortcuts import redirect
from django.urls import reverse
from django.conf import settings


class RestricaoEtariaMiddleware:
    """Protege templates e Django Admin; APIs validam em cada autenticação."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path.startswith('/api/') or not request.user.is_authenticated:
            return self.get_response(request)
        from usuarios.idade import restricao_etaria_ativa
        restrita, _estado = restricao_etaria_ativa(request.user)
        if restrita:
            permitidas = {
                reverse('usuarios:elegibilidade'), reverse('usuarios:aceitar_termos'),
                reverse('usuarios:excluir_conta'), reverse('usuarios:logout'),
                reverse('logout'), reverse('diretrizes'),
            }
            if request.path not in permitidas:
                if request.method in {'GET', 'HEAD'} and request.path == reverse('biblioteca'):
                    from django.contrib.auth.models import AnonymousUser
                    request.user = AnonymousUser()
                else:
                    return redirect('usuarios:elegibilidade')
        return self.get_response(request)

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
                reverse('usuarios:elegibilidade'),
                reverse('usuarios:excluir_conta'),
                reverse('usuarios:logout'),
                reverse('api_idade'),
                reverse('api_suporte'),
                reverse('api_exportar_dados'),
                reverse('api_excluir_conta'),
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
