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
