from django.urls import path
from .moderacao import AcompanhamentoPublicoAPIView, ComplementoPublicoAPIView, DenunciaPublicaAPIView

urlpatterns = [
    path('', DenunciaPublicaAPIView.as_view(), name='api_denuncia_publica'),
    path('acompanhamento/', AcompanhamentoPublicoAPIView.as_view(), name='api_denuncia_acompanhamento'),
    path('complemento/', ComplementoPublicoAPIView.as_view(), name='api_denuncia_complemento'),
]
