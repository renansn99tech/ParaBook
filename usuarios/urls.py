from django.urls import path
from django.contrib.auth import views as auth_views # views nativas de autenticação do Django
from .views import tela_login, register, logout_view, excluir_conta # views do ParaBook

# ATENÇÃO: Essa linha é obrigatória para o Django enxergar o app "usuarios"
app_name = 'usuarios'

urlpatterns = [
    path('login/', tela_login, name='login'),
    path('register/', register, name='register'),
    path('logout/', logout_view, name='logout'),
    path('excluir-conta/', excluir_conta, name='excluir_conta'),

    # Nova rota chamando a ferramenta de senha do Django
    path('alterar-senha/', auth_views.PasswordChangeView.as_view(template_name='perfis/alterar_senha.html', # página dentro do app perfis
            success_url='/conta/perfil/' # Volta para o perfil quando der certo
            ), name='alterar_senha'),
]