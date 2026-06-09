"""
URL configuration for config project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include   # <-- aqui está o include
from usuarios.views import index, sobre, leitura, tela_login, register, logout_view    # importa sua view
from biblioteca.views import biblioteca, mais_acessados, novidade, obras_autores
from django.contrib.auth.views import PasswordChangeView
from django.contrib.auth import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    # Página inicial
    path('', index, name='home'), # Página inicial 
    path('usuarios/', include('usuarios.urls')), # Linha inserida com os URLs do app Usuarios
    path('sobre/', sobre, name='sobre'),
    path('comunidades/', include('comunidades.urls')),
    path('biblioteca/', include('biblioteca.urls')),
    path('conta/', include('perfis.urls', namespace='perfis')), # Adicionando url do app Perfis
    path('leitura/', leitura, name='leitura'),
    path('login/', tela_login, name='login'),
    path('logout/', logout_view, name='logout'), # Adicionada uma view "logout_view" para a função logout do app Perfis
    path('alterar-senha/', PasswordChangeView.as_view(template_name='perfis/alterar_senha.html'), name='alterar_senha'),
    path('register/', register, name='register'),
    path('password-reset/', auth_views.PasswordResetView.as_view(template_name='usuarios/password_reset.html'), name='password_reset'),
]