from django.urls import path
from .views import perfil, admin

urlpatterns = [
    path('perfil/', perfil, name='perfil'),
    path('admin/', admin, name='admin'),
]