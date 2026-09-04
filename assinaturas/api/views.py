import os
import stripe
from django.conf import settings
from rest_framework import viewsets, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from assinaturas.models import Plano, Assinatura
from .serializers import PlanoSerializer, AssinaturaSerializer
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import get_object_or_404


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


class CheckoutSessionAPIView(APIView):
    """Inicia assinatura sem aceitar URLs de retorno controladas pelo cliente."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        plano = get_object_or_404(Plano, pk=request.data.get('plano_id'))

        if plano.preco > 0 and not settings.PAYMENTS_ENABLED:
            return Response(
                {
                    'detail': 'Assinaturas pagas estarão disponíveis em uma próxima etapa do ParaBook.',
                    'code': 'feature_indisponivel',
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        assinatura_atual = Assinatura.objects.filter(usuario=request.user, ativa=True).select_related('plano').first()

        if assinatura_atual and assinatura_atual.stripe_subscription_id:
            return Response(
                {"detail": "Gerencie a assinatura atual antes de trocar de plano.", "usar_portal": True},
                status=status.HTTP_409_CONFLICT,
            )

        frontend_url = settings.FRONTEND_URL.rstrip('/')
        if plano.preco == 0:
            assinatura, _ = Assinatura.objects.get_or_create(usuario=request.user)
            assinatura.plano = plano
            assinatura.ativa = True
            assinatura.stripe_customer_id = None
            assinatura.stripe_subscription_id = None
            assinatura.data_fim = None
            assinatura.save()
            return Response({"url": f"{frontend_url}/minha-assinatura", "gratuito": True})

        if not plano.stripe_price_id:
            return Response(
                {"detail": "Este plano ainda não está disponível para contratação."},
                status=status.HTTP_409_CONFLICT,
            )

        stripe_key = getattr(settings, 'STRIPE_SECRET_KEY', None) or os.getenv('STRIPE_SECRET_KEY')
        if not stripe_key:
            return Response(
                {"detail": "O checkout está temporariamente indisponível."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        stripe.api_key = stripe_key
        checkout_session = stripe.checkout.Session.create(
            line_items=[{'price': plano.stripe_price_id, 'quantity': 1}],
            mode='subscription',
            success_url=f"{frontend_url}/minha-assinatura?sucesso=true",
            cancel_url=f"{frontend_url}/planos?cancelado=true",
            client_reference_id=str(request.user.id),
            metadata={
                'plano_id': str(plano.id),
                'user_id': str(request.user.id),
            },
            subscription_data={
                'metadata': {
                    'plano_id': str(plano.id),
                    'user_id': str(request.user.id),
                },
            },
        )
        return Response({"url": checkout_session.url}, status=status.HTTP_201_CREATED)


class PortalSessionAPIView(APIView):
    """Gera uma sessão do Stripe Customer Portal (mesma lógica de assinaturas/views.py::criar_sessao_portal,
    só que devolvendo a URL em JSON em vez de redirecionar - quem redireciona é o React)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not settings.PAYMENTS_ENABLED:
            return Response(
                {
                    'detail': 'O gerenciamento de pagamentos ainda não está disponível.',
                    'code': 'feature_indisponivel',
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

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
        # Destino definido pelo servidor: impede redirecionamento aberto via query string.
        return_url = f"{settings.FRONTEND_URL.rstrip('/')}/minha-assinatura"

        portal_session = stripe.billing_portal.Session.create(
            customer=assinatura.stripe_customer_id,
            return_url=return_url,
        )
        return Response({"url": portal_session.url})
