from django.urls import path
from .views import painel_admin

# Essa linha resolve o NoReverseMatch
app_name = 'dashboard'

urlpatterns = [
    path('painel-admin/', painel_admin, name='painel_admin'),
]