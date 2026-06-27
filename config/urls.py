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
from usuarios.views import index, sobre, tela_login, register, logout_view    # importa sua view
from django.contrib.auth.views import PasswordChangeView
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    # Templates globais
    path('', index, name='home'), # Página inicial
    path('sobre/', sobre, name='sobre'), # Página 'Sobre' do projeto

    # App usuarios
    path('usuarios/', include('usuarios.urls')), # Linha inserida com os URLs do app Usuarios
    path('register/', register, name='register'),
    
    # App comunidades
    path('comunidades/', include('comunidades.urls')),

    # App biblioteca
    path('biblioteca/', include('biblioteca.urls')),

    # App perfis
    path('conta/', include('perfis.urls', namespace='perfis')), # Adicionando url do app Perfis

    # App dashboard
    path('dashboard/', include('dashboard.urls')),

    # Urls auxiliares
    path('login/', tela_login, name='login'),
    path('logout/', logout_view, name='logout'), # Adicionada uma view "logout_view" para a função logout do app Perfis
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)