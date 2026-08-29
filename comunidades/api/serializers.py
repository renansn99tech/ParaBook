from django.contrib.auth.models import User
from rest_framework import serializers
from comunidades.models import Comunidade, PostagemComunidade, RespostaPostagem
from usuarios.identidade_publica import (
    IDENTIFICADOR_ADMIN_PUBLICO,
    NOME_ADMIN_PUBLICO,
    conta_administrativa,
    identidade_publica,
)


def _identidade(serializer, user):
    # Nas superfícies de comunidade a administração fala como instituição,
    # inclusive quando outra conta admin está visualizando o conteúdo.
    if conta_administrativa(user):
        return {
            'username': IDENTIFICADOR_ADMIN_PUBLICO,
            'nome_exibicao': NOME_ADMIN_PUBLICO,
            'perfil_clicavel': False,
            'tipo': 'admin',
        }
    request = serializer.context.get('request')
    viewer = request.user if request else None
    return identidade_publica(user, viewer)


class MembroComunidadeSerializer(serializers.ModelSerializer):
    """Identificação enxuta de um membro para a lista de Configurações."""

    username = serializers.SerializerMethodField()
    nome_exibicao = serializers.SerializerMethodField()
    e_criador = serializers.SerializerMethodField()
    perfil_clicavel = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'nome_exibicao', 'e_criador', 'perfil_clicavel']

    def get_username(self, obj):
        return _identidade(self, obj)['username']

    def get_nome_exibicao(self, obj):
        return _identidade(self, obj)['nome_exibicao']

    def get_e_criador(self, obj):
        comunidade = self.context.get('comunidade')
        return bool(comunidade and comunidade.criador_id == obj.id)

    def get_perfil_clicavel(self, obj):
        return _identidade(self, obj)['perfil_clicavel']

class RespostaPostagemSerializer(serializers.ModelSerializer):
    autor_nome = serializers.SerializerMethodField()
    autor_perfil_clicavel = serializers.SerializerMethodField()
    postagem_titulo = serializers.CharField(source='postagem.titulo', read_only=True)

    class Meta:
        model = RespostaPostagem
        fields = [
            'id', 'postagem', 'postagem_titulo', 'autor', 'autor_nome', 'autor_perfil_clicavel',
            'conteudo', 'criado_em', 'atualizado_em',
        ]
        read_only_fields = ['id', 'autor', 'criado_em', 'atualizado_em']

    def get_autor_nome(self, obj):
        return _identidade(self, obj.autor)['username']

    def get_autor_perfil_clicavel(self, obj):
        return _identidade(self, obj.autor)['perfil_clicavel']


class PostagemComunidadeSerializer(serializers.ModelSerializer):
    autor_nome = serializers.SerializerMethodField()
    autor_perfil_clicavel = serializers.SerializerMethodField()
    total_respostas = serializers.SerializerMethodField()

    class Meta:
        model = PostagemComunidade
        fields = ['id', 'comunidade', 'autor', 'autor_nome', 'autor_perfil_clicavel', 'titulo', 'conteudo', 'imagem', 'total_respostas', 'criado_em', 'atualizado_em']
        read_only_fields = ['id', 'autor', 'criado_em', 'atualizado_em']

    def get_total_respostas(self, obj):
        anotado = getattr(obj, 'total_respostas_anotado', None)
        return anotado if anotado is not None else obj.respostas.count()

    def get_autor_nome(self, obj):
        return _identidade(self, obj.autor)['username']

    def get_autor_perfil_clicavel(self, obj):
        return _identidade(self, obj.autor)['perfil_clicavel']

class ComunidadeSerializer(serializers.ModelSerializer):
    criador_nome = serializers.SerializerMethodField()
    criador_perfil_clicavel = serializers.SerializerMethodField()
    total_membros = serializers.SerializerMethodField()
    usuario_participa = serializers.SerializerMethodField()
    usuario_e_dono = serializers.SerializerMethodField()

    class Meta:
        model = Comunidade
        fields = [
            'id', 'nome', 'descricao', 'data_criacao', 'criador', 'criador_nome', 'criador_perfil_clicavel',
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

    def get_criador_nome(self, obj):
        return _identidade(self, obj.criador)['username'] if obj.criador else None

    def get_criador_perfil_clicavel(self, obj):
        return _identidade(self, obj.criador)['perfil_clicavel'] if obj.criador else False

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
