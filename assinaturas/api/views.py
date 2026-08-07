import os
import stripe
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from assinaturas.models import Plano, Assinatura
from .serializers import PlanoSerializer, AssinaturaSerializer
from django.core.exceptions import ObjectDoesNotExist

class PlanoViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Plano.objects.all().order_by('preco')
    serializer_class = PlanoSerializer
    permission_classes = [permissions.AllowAny]

class MinhaAssinaturaAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        try:
            assinatura = Assinatura.objects.get(usuario=request.user)
            serializer = AssinaturaSerializer(assinatura)
            return Response(serializer.data)
        except ObjectDoesNotExist:
            # Retorna um 404 "soft" com JSON para o front-end saber que não há plano
            return Response(
                {"detail": "Você não possui um plano ativo no momento.", "assinatura": None},
                status=status.HTTP_404_NOT_FOUND
            )


class PortalSessionAPIView(APIView):
    """Gera uma sessão do Stripe Customer Portal (mesma lógica de assinaturas/views.py::criar_sessao_portal,
    só que devolvendo a URL em JSON em vez de redirecionar - quem redireciona é o React)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        stripe_key = getattr(settings, 'STRIPE_SECRET_KEY', None) or os.getenv('STRIPE_SECRET_KEY')
        if not stripe_key:
            return Response(
                {"detail": "Erro de configuração: STRIPE_SECRET_KEY não foi encontrada."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        try:
            assinatura = Assinatura.objects.get(usuario=request.user, ativa=True)
        except Assinatura.DoesNotExist:
            return Response(
                {"detail": "Você não possui uma assinatura ativa no momento."},
                status=status.HTTP_404_NOT_FOUND
            )

        if not assinatura.stripe_customer_id:
            return Response(
                {"detail": "Esta assinatura ainda não possui um cliente Stripe associado."},
                status=status.HTTP_400_BAD_REQUEST
            )

        stripe.api_key = stripe_key
        # O React manda de volta pra onde ele mesmo quer voltar (funciona tanto em localhost:5173
        # quanto no domínio de produção, sem o backend precisar saber a origem do front-end).
        return_url = request.query_params.get('return_url') or request.build_absolute_uri('/')

        portal_session = stripe.billing_portal.Session.create(
            customer=assinatura.stripe_customer_id,
            return_url=return_url,
        )
        return Response({"url": portal_session.url})
