from django.urls import path
from .views import perfil, perfil_publico, virar_autor, onboarding_autor, CustomPasswordChangeView

# Namespace do app (boa prática)
app_name = 'perfis'

urlpatterns = [
    # Rota do perfil do usuário
    path('perfil/', perfil, name='perfil_pessoal'),
    path('perfil/upgrade/', virar_autor, name='virar_autor'), # <-- Nova Rota para Autores
    
    # Nova rota chamando a ferramenta de senha do Django
    path('alterar-senha/', CustomPasswordChangeView.as_view(template_name='perfis/alterar_senha.html', # página dentro do app perfis
            success_url='/conta/perfil/' # Volta para o perfil quando der certo
            ), name='alterar_senha'),

    # === NOVA ROTA DO PERFIL COLETIVO ===
    path('perfil/<str:username_alvo>/', perfil_publico, name='perfil_publico'),

    # NOVA ROTA: Página de informações vitais antes de virar autor
    path('autor/onboarding/', onboarding_autor, name='onboarding_autor'),
]
