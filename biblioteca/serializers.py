# biblioteca/serializers.py
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from .models import Categoria, Livro, Biblioteca, Denuncia, SolicitacaoPublicacao


class CategoriaSerializer(serializers.ModelSerializer):
    """Serializer para o modelo Categoria."""
    class Meta:
        model = Categoria
        fields = ['id', 'nome']


class LivroSerializer(serializers.ModelSerializer):
    """
    Serializer principal para Livros.
    Exibe dados da categoria na leitura e aceita ID da categoria na escrita.
    """
    categoria_detail = CategoriaSerializer(source='categoria', read_only=True)
    capa_url = serializers.ReadOnlyField()
    url_pdf_estatico = serializers.SerializerMethodField()

    class Meta:
        model = Livro
        fields = [
            'id',
            'titulo',
            'autor',
            'ano_publicacao',
            'avaliacao',
            'isbn',
            'paginas',
            'edicao',
            'capa',
            'capa_url',
            'pdf',
            'url_pdf_estatico',
            'categoria',
            'categoria_detail',
            'origem',
            'status',
            'data_remocao',
        ]
        read_only_fields = ['id', 'avaliacao', 'data_remocao']

    def get_url_pdf_estatico(self, obj):
        # Trata com segurança caso o livro não possua categoria associada
        if not obj.categoria:
            return None
        return obj.url_pdf_estatico


class BibliotecaSerializer(serializers.ModelSerializer):
    """
    Serializer para a estante/biblioteca do usuário com validação de unicidade.
    """
    livro_detail = LivroSerializer(source='livro', read_only=True)
    user = serializers.HiddenField(default=serializers.CurrentUserDefault())

    class Meta:
        model = Biblioteca
        fields = [
            'id',
            'user',
            'livro',
            'livro_detail',
            'status',
            'favorito',
            'nota',
            'resenha',
            'data_adicao',
        ]
        read_only_fields = ['id', 'data_adicao']
        # Evita erro 500 no banco ao tentar adicionar o mesmo livro duas vezes
        validators = [
            UniqueTogetherValidator(
                queryset=Biblioteca.objects.all(),
                fields=['user', 'livro'],
                message="Este livro já está na sua biblioteca."
            )
        ]

    def validate_nota(self, value):
        if value is not None and (value < 1 or value > 5):
            raise serializers.ValidationError("A nota deve ser um valor inteiro entre 1 e 5.")
        return value


class DenunciaSerializer(serializers.ModelSerializer):
    """Serializer para denúncias de obras."""
    usuario_nome = serializers.ReadOnlyField(source='usuario.username')
    livro_titulo = serializers.ReadOnlyField(source='livro.titulo')

    class Meta:
        model = Denuncia
        fields = [
            'id',
            'livro',
            'livro_titulo',
            'usuario',
            'usuario_nome',
            'motivo',
            'data_denuncia',
            'status',
            'arquivada',
            'data_arquivamento',
        ]
        read_only_fields = ['id', 'usuario', 'data_denuncia', 'status', 'arquivada', 'data_arquivamento']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['usuario'] = request.user
        return super().create(validated_data)


class SolicitacaoPublicacaoSerializer(serializers.ModelSerializer):
    """Serializer para solicitações de publicação de autores independentes."""
    livro_detail = LivroSerializer(source='livro', read_only=True)
    usuario_nome = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = SolicitacaoPublicacao
        fields = [
            'id',
            'usuario',
            'usuario_nome',
            'livro',
            'livro_detail',
            'status',
            'observacao_admin',
            'data_envio',
            'data_analise',
        ]
        read_only_fields = ['id', 'usuario', 'status', 'observacao_admin', 'data_envio', 'data_analise']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and hasattr(request, 'user') and request.user.is_authenticated:
            validated_data['usuario'] = request.user
        return super().create(validated_data)