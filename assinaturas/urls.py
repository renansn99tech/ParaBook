from django.urls import path
from . import views

app_name = 'assinaturas'

urlpatterns = [
    path('planos/', views.listar_planos, name='listar_planos'),
    path('minha-assinatura/', views.minha_assinatura, name='minha_assinatura'),
]