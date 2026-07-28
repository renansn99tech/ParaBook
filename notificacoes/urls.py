from django.urls import path
from . import views

app_name = 'notificacoes'

urlpatterns = [
    path('', views.lista_notificacoes, name='lista'),
    path('ler/<int:pk>/', views.marcar_como_lida, name='marcar_como_lida'),
    path('marcar-todas-lidas/', views.marcar_todas_como_lidas, name='marcar_todas_como_lidas'),
]