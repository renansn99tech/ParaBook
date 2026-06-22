from django.urls import path
from .views import painel_admin

urlpatterns = [
    path('', painel_admin, name='painel_admin'),
]