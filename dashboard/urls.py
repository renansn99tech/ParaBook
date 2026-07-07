from django.urls import path
from .views import painel_admin, surpresa, leitor

# Essa linha resolve o NoReverseMatch
app_name = 'dashboard'

urlpatterns = [
    path('painel-admin/', painel_admin, name='painel_admin'),
    path('surpresa/', surpresa, name='surpresa'),
    path('leitor/', leitor, name='leitor')
]