from rest_framework import serializers
from notificacoes.models import Notificacao

class NotificacaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = Notificacao
        fields = ['id', 'titulo', 'mensagem', 'tipo', 'tipo_display', 'link', 'lida', 'data_criacao']
        read_only_fields = ['id', 'titulo', 'mensagem', 'tipo', 'tipo_display', 'link', 'data_criacao']
