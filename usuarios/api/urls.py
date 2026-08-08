from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import (
    RegisterAPIView,
    UserProfileAPIView,
    ChangePasswordAPIView,
    ExcluirContaAPIView,
    PasswordResetRequestAPIView,
    PasswordResetConfirmAPIView,
    AceitarTermosAPIView,
)

urlpatterns = [
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('register/', RegisterAPIView.as_view(), name='api_register'),
    path('profile/', UserProfileAPIView.as_view(), name='api_profile'),
    path('alterar-senha/', ChangePasswordAPIView.as_view(), name='api_alterar_senha'),
    path('recuperar-senha/', PasswordResetRequestAPIView.as_view(), name='api_recuperar_senha'),
    path('redefinir-senha/', PasswordResetConfirmAPIView.as_view(), name='api_redefinir_senha'),
    path('aceitar-termos/', AceitarTermosAPIView.as_view(), name='api_aceitar_termos'),
    path('excluir-conta/', ExcluirContaAPIView.as_view(), name='api_excluir_conta'),
]
