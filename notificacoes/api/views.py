from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from notificacoes.models import Notificacao
from .serializers import NotificacaoSerializer
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiParameter, extend_schema, extend_schema_view
from rest_framework import serializers


class StatusNotificacaoSerializer(serializers.Serializer):
    status = serializers.CharField()

@extend_schema_view(
    retrieve=extend_schema(parameters=[OpenApiParameter('id', OpenApiTypes.INT, OpenApiParameter.PATH)]),
    update=extend_schema(parameters=[OpenApiParameter('id', OpenApiTypes.INT, OpenApiParameter.PATH)]),
    partial_update=extend_schema(parameters=[OpenApiParameter('id', OpenApiTypes.INT, OpenApiParameter.PATH)]),
    destroy=extend_schema(parameters=[OpenApiParameter('id', OpenApiTypes.INT, OpenApiParameter.PATH)]),
)
class NotificacaoViewSet(viewsets.ModelViewSet):
    queryset = Notificacao.objects.none()
    serializer_class = NotificacaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notificacao.objects.filter(usuario=self.request.user)

    @action(detail=True, methods=['post', 'patch'])
    @extend_schema(responses=StatusNotificacaoSerializer)
    def lida(self, request, pk=None):
        notificacao = self.get_object()
        notificacao.lida = True
        notificacao.save(update_fields=['lida'])
        return Response({'status': 'notificação marcada como lida'})

    @action(detail=False, methods=['post'])
    @extend_schema(responses=StatusNotificacaoSerializer)
    def marcar_todas_lidas(self, request):
        notificacoes = self.get_queryset().filter(lida=False)
        updated_count = notificacoes.update(lida=True)
        return Response({'status': f'{updated_count} notificações marcadas como lidas'})
