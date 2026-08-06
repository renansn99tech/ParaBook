from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from notificacoes.models import Notificacao
from .serializers import NotificacaoSerializer

class NotificacaoViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacaoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Notificacao.objects.filter(usuario=self.request.user)

    @action(detail=True, methods=['post', 'patch'])
    def lida(self, request, pk=None):
        notificacao = self.get_object()
        notificacao.lida = True
        notificacao.save(update_fields=['lida'])
        return Response({'status': 'notificação marcada como lida'})

    @action(detail=False, methods=['post'])
    def marcar_todas_lidas(self, request):
        notificacoes = self.get_queryset().filter(lida=False)
        updated_count = notificacoes.update(lida=True)
        return Response({'status': f'{updated_count} notificações marcadas como lidas'})
