from rest_framework import serializers

from gamificacao.models import Conquista, ProgressoLeitor


class ProgressoLeitorSerializer(serializers.ModelSerializer):
    """Linha do ranking: identifica o leitor sem expor dados sensíveis do User."""

    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    nome_exibicao = serializers.SerializerMethodField()

    class Meta:
        model = ProgressoLeitor
        fields = ['user_id', 'username', 'nome_exibicao', 'pontos_xp', 'nivel', 'dias_seguidos']

    def get_nome_exibicao(self, obj):
        return obj.user.get_full_name() or obj.user.username


class ConquistaSerializer(serializers.ModelSerializer):
    """
    Catálogo de conquistas anotado com o estado do usuário logado.
    O `desbloqueadas_map` vem do contexto para evitar uma query por conquista (N+1).
    """

    categoria_display = serializers.CharField(source='get_categoria_display', read_only=True)
    desbloqueada = serializers.SerializerMethodField()
    data_desbloqueio = serializers.SerializerMethodField()

    class Meta:
        model = Conquista
        fields = [
            'id', 'slug', 'nome', 'descricao', 'icone',
            'categoria', 'categoria_display', 'pontos_recompensa',
            'desbloqueada', 'data_desbloqueio',
        ]

    def get_desbloqueada(self, obj):
        return obj.id in self.context.get('desbloqueadas_map', {})

    def get_data_desbloqueio(self, obj):
        return self.context.get('desbloqueadas_map', {}).get(obj.id)
