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
from usuarios.views import diretrizes, index, sobre, tela_login, register, logout_view, backlog    # importa sua view
from django.contrib.auth.views import PasswordChangeView
from django.contrib.auth import views as auth_views
from django.conf import settings
from django.conf.urls.static import static
# pyrefly: ignore [missing-import]
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from config.views import health, readiness

urlpatterns = [
    path('health/', health, name='health'),
    path('ready/', readiness, name='readiness'),
    path('admin/', admin.site.urls),
    # Templates globais
    path('', index, name='home'), # Página inicial
    path('sobre/', sobre, name='sobre'), # Página 'Sobre' do projeto
    path('diretrizes/', diretrizes, name='diretrizes'), # Página 'Diretrizes' do projeto
    path('backlog/', backlog, name='backlog'),

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
    
    # App assinaturas
    path('assinaturas/', include('assinaturas.urls', namespace='assinaturas')),
    
    # App notificacoes
    path('notificacoes/', include('notificacoes.urls')),
    
    # App gamificacao
    path('gamificacao/', include('gamificacao.urls', namespace='gamificacao')),

    # Urls auxiliares
    path('login/', tela_login, name='login'),
    path('logout/', logout_view, name='logout'), # Adicionada uma view "logout_view" para a função logout do app Perfis

    # --- API Routes (Fase 2) ---
    path('api/docs/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/v1/auth/', include('usuarios.api.urls')),
    path('api/v1/biblioteca/', include('biblioteca.api.urls')),
    path('api/v1/comunidades/', include('comunidades.api.urls')),
    path('api/v1/perfis/', include('perfis.api.urls')),
    path('api/v1/dashboard/', include('dashboard.api.urls')),
    path('api/v1/notificacoes/', include('notificacoes.api.urls')),
    path('api/v1/assinaturas/', include('assinaturas.api.urls')),
    path('api/v1/gamificacao/', include('gamificacao.api.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
