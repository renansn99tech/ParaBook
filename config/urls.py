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
from usuarios.views import index, sobre, leitura, tela_login    # importa sua view
from biblioteca.views import biblioteca
from perfis.views import perfil


urlpatterns = [
    path('admin/', admin.site.urls),

    # Página inicial
    path('', index, name='home'),   
    path('sobre/', sobre, name='sobre'),  
    path('comunidades/', include('comunidades.urls')),
    path('biblioteca/', biblioteca, name='biblioteca'),
    path('perfis/', perfil, name='perfis'),
    path('usuarios/', leitura, name='leitura'),
    path('usuarios/', tela_login, name='tela_login'),
    
]
