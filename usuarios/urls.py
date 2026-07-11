from django.urls import path, reverse_lazy
from django.contrib.auth import views as auth_views # views nativas de autenticação do Django
from .views import tela_login, register, logout_view, excluir_conta, aceitar_termos # views do ParaBook

# ATENÇÃO: Essa linha é obrigatória para o Django enxergar o app "usuarios"
app_name = 'usuarios'

urlpatterns = [
    path('login/', tela_login, name='login'),
    path('register/', register, name='register'),
    path('logout/', logout_view, name='logout'),
    path('excluir-conta/', excluir_conta, name='excluir_conta'),

    # NOVA ROTA: Tela de bloqueio/aceite de termos
    path('aceitar-termos/', aceitar_termos, name='aceitar_termos'),

    path('password-reset/', auth_views.PasswordResetView.as_view(
        template_name='usuarios/password_reset.html',
        email_template_name='usuarios/password_reset_email.html',
        success_url=reverse_lazy('usuarios:password_reset_done')
    ), name='password_reset'),

    path('password-reset/done/', auth_views.PasswordResetDoneView.as_view(
        template_name='usuarios/password_reset_done.html'
    ), name='password_reset_done'),

    path('password-reset-confirm/<uidb64>/<token>/', auth_views.PasswordResetConfirmView.as_view(
        template_name='usuarios/password_reset_confirm.html',
        success_url=reverse_lazy('usuarios:password_reset_complete') # <-- Evitando o erro do redirect
    ), name='password_reset_confirm'),

    path('password-reset-complete/', auth_views.PasswordResetCompleteView.as_view(
        template_name='usuarios/password_reset_complete.html'
    ), name='password_reset_complete'),
]