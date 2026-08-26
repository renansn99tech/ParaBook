from django.contrib.auth.models import User
from rest_framework import serializers
from comunidades.models import Comunidade, PostagemComunidade, RespostaPostagem


class MembroComunidadeSerializer(serializers.ModelSerializer):
    """Identificação enxuta de um membro para a lista de Configurações."""

    nome_exibicao = serializers.SerializerMethodField()
    e_criador = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'nome_exibicao', 'e_criador']

    def get_nome_exibicao(self, obj):
        return obj.get_full_name() or obj.username

    def get_e_criador(self, obj):
        comunidade = self.context.get('comunidade')
        return bool(comunidade and comunidade.criador_id == obj.id)

class RespostaPostagemSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='autor.username', read_only=True)
    postagem_titulo = serializers.CharField(source='postagem.titulo', read_only=True)

    class Meta:
        model = RespostaPostagem
        fields = [
            'id', 'postagem', 'postagem_titulo', 'autor', 'autor_nome',
            'conteudo', 'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['id', 'autor', 'criado_em', 'atualizado_em']


class PostagemComunidadeSerializer(serializers.ModelSerializer):
    autor_nome = serializers.CharField(source='autor.username', read_only=True)
    total_respostas = serializers.SerializerMethodField()

    class Meta:
        model = PostagemComunidade
        fields = ['id', 'comunidade', 'autor', 'autor_nome', 'titulo', 'conteudo', 'imagem', 'total_respostas', 'criado_em', 'atualizado_em']
        read_only_fields = ['id', 'autor', 'criado_em', 'atualizado_em']

    def get_total_respostas(self, obj):
        anotado = getattr(obj, 'total_respostas_anotado', None)
        return anotado if anotado is not None else obj.respostas.count()

class ComunidadeSerializer(serializers.ModelSerializer):
    criador_nome = serializers.CharField(source='criador.username', read_only=True)
    total_membros = serializers.SerializerMethodField()
    usuario_participa = serializers.SerializerMethodField()
    usuario_e_dono = serializers.SerializerMethodField()

    class Meta:
        model = Comunidade
        fields = [
            'id', 'nome', 'descricao', 'data_criacao', 'criador', 'criador_nome',
            'criada_por_sistema', 'em_manutencao', 'max_participantes',
            'total_denuncias', 'total_membros', 'usuario_participa', 'usuario_e_dono'
        ]
        # Lotação, manutenção e governança são definidas pelo servidor (REGRAS 3, 8 e 9),
        # nunca pelo payload do cliente.
        read_only_fields = [
            'id', 'data_criacao', 'criador', 'criada_por_sistema',
            'total_denuncias', 'em_manutencao', 'max_participantes',
        ]

    def get_total_membros(self, obj):
        return obj.membros.count()

    def get_usuario_participa(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.membros.filter(id=request.user.id).exists()
        return False

    def get_usuario_e_dono(self, obj):
        """Permite ao front exibir os botões de editar/excluir só para o criador."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.criador_id == request.user.id or request.user.is_superuser
        return False
