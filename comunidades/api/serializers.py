from rest_framework import serializers
from comunidades.models import Comunidade, PostagemComunidade

class PostagemComunidadeSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='autor.username', read_only=True)

    class Meta:
        model = PostagemComunidade
        fields = ['id', 'comunidade', 'autor', 'autor_nome', 'titulo', 'conteudo', 'imagem', 'criado_em', 'atualizado_em']
        read_only_fields = ['id', 'autor', 'criado_em', 'atualizado_em']

class ComunidadeSerializer(serializers.ModelSerializer):
    criador_nome = serializers.CharField(source='criador.username', read_only=True)
    total_membros = serializers.SerializerMethodField()
    usuario_participa = serializers.SerializerMethodField()

    class Meta:
        model = Comunidade
        fields = [
            'id', 'nome', 'descricao', 'data_criacao', 'criador', 'criador_nome',
            'criada_por_sistema', 'em_manutencao', 'max_participantes', 
            'total_denuncias', 'total_membros', 'usuario_participa'
        ]
        read_only_fields = ['id', 'data_criacao', 'criador', 'criada_por_sistema', 'total_denuncias']

    def get_total_membros(self, obj):
        return obj.membros.count()

    def get_usuario_participa(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.membros.filter(id=request.user.id).exists()
        return False
