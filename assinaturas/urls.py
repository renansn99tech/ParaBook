from django.urls import path
from . import views
from . import webhooks

app_name = 'assinaturas'

urlpatterns = [
    path('planos/', views.listar_planos, name='listar_planos'),
    path('minha-assinatura/', views.minha_assinatura, name='minha_assinatura'),
    path('checkout/<int:plano_id>/', views.criar_sessao_checkout, name='criar_sessao_checkout'),
    path('portal/', views.criar_sessao_portal, name='criar_sessao_portal'),
    path('webhook/', webhooks.stripe_webhook, name='stripe_webhook'),
]