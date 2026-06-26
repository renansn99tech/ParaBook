from django.urls import path
from django.contrib.auth import views as auth_views # views nativas de autenticação do Django
from .views import perfil, virar_autor

# Namespace do app (boa prática)
app_name = 'perfis'

urlpatterns = [
    # Rota do perfil do usuário
    path('perfil/', perfil, name='perfil_pessoal'),
    path('perfil/upgrade/', virar_autor, name='virar_autor'), # <-- Nova Rota para Autores
    
    # Nova rota chamando a ferramenta de senha do Django
    path('alterar-senha/', auth_views.PasswordChangeView.as_view(template_name='perfis/alterar_senha.html', # página dentro do app perfis
            success_url='/conta/perfil/' # Volta para o perfil quando der certo
            ), name='alterar_senha'),
]
