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

    path('password-reset/', auth_views.PasswordResetView.as_view(template_name='usuarios/password_reset.html'), name='password_reset'),
    # 1. Página de sucesso dizendo "E-mail enviado!"
    path('password-reset/done/', 
         auth_views.PasswordResetDoneView.as_view(), 
         name='password_reset_done'),

    # 2. O link de segurança que vai dentro do e-mail (O que causou o erro do Print 2)
    path('password-reset-confirm/<uidb64>/<token>/', 
         auth_views.PasswordResetConfirmView.as_view(), 
         name='password_reset_confirm'),

    # 3. Página final dizendo "Sua senha foi redefinida com sucesso!"
    path('password-reset-complete/', 
         auth_views.PasswordResetCompleteView.as_view(), 
         name='password_reset_complete'),
]