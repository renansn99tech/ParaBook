# api/serializers.py
from django.conf import settings
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator
from biblioteca.models import Livro, Categoria, Biblioteca, SolicitacaoPublicacao
from django.contrib.auth.models import User

class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = '__all__'

class LivroSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source='categoria.nome', read_only=True)
    capa_url = serializers.SerializerMethodField()

    class Meta:
        model = Livro
        fields = [
            'id', 'titulo', 'autor', 'categoria', 'categoria_nome', 
            'origem', 'status', 'ano_publicacao', 'paginas', 
            'avaliacao', 'isbn', 'capa_url'
        ]

    def get_capa_url(self, obj):
        if obj.capa:
            return obj.capa.url
        return None

class EstanteSerializer(serializers.ModelSerializer):
    livro_titulo = serializers.CharField(source='livro.titulo', read_only=True)
    livro_autor = serializers.CharField(source='livro.autor', read_only=True)
    livro_capa = serializers.SerializerMethodField()

    class Meta:
        model = Biblioteca
        fields = ['id', 'livro', 'livro_titulo', 'livro_autor', 'livro_capa', 'status', 'favorito', 'nota', 'resenha', 'data_adicao']
        read_only_fields = ['user']
        validators = [
            UniqueTogetherValidator(
                queryset=Biblioteca.objects.all(),
                fields=['user', 'livro'],
                message="Este livro já está presente na sua estante."
            )
        ]

    def get_livro_capa(self, obj):
        if obj.livro and obj.livro.capa:
            return obj.livro.capa.url
        return None

class ResenhaSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='user.username', read_only=True)
    usuario_foto = serializers.SerializerMethodField()

    class Meta:
        model = Biblioteca
        fields = ['id', 'usuario_nome', 'usuario_foto', 'nota', 'resenha', 'data_adicao']
    
    def get_usuario_foto(self, obj):
        # Mapeia dinamicamente os relacionamentos de Perfil existentes no Parabook
        user = obj.user
        if hasattr(user, 'perfil_da_biblioteca') and user.perfil_da_biblioteca.foto:
            return user.perfil_da_biblioteca.foto.url
        elif hasattr(user, 'perfil') and user.perfil.foto:
            return user.perfil.foto.url
        return None


class SolicitacaoPublicacaoSerializer(serializers.ModelSerializer):
    """Recebe o formulário de PublicarLivro.jsx e cria o Livro (status=pendente) + a solicitação de moderação."""
    pdf = serializers.FileField(required=True, error_messages={'required': 'O arquivo PDF do livro é obrigatório.'})

    # Campos de identificação/compliance do autor: validados aqui, mas ainda não persistidos
    # em nenhum model (mesmo comportamento da ObraAutorForm legada - ver biblioteca/forms.py).
    cpf_autor = serializers.CharField(write_only=True, max_length=14)
    registro_autoral = serializers.CharField(write_only=True, max_length=100, required=False, allow_blank=True)
    numero_registro = serializers.CharField(write_only=True, max_length=20, required=False, allow_blank=True)
    declaracao_autoria = serializers.BooleanField(write_only=True)
    aceitou_termos = serializers.BooleanField(write_only=True)

    class Meta:
        model = Livro
        fields = [
            'id', 'titulo', 'categoria', 'paginas', 'ano_publicacao', 'isbn', 'edicao', 'capa', 'pdf',
            'cpf_autor', 'registro_autoral', 'numero_registro', 'declaracao_autoria', 'aceitou_termos',
        ]

    def validate_declaracao_autoria(self, value):
        if not value:
            raise serializers.ValidationError("É necessário declarar que você é o autor da obra.")
        return value

    def validate_aceitou_termos(self, value):
        if not value:
            raise serializers.ValidationError("É necessário aceitar os termos de uso.")
        return value

    def validate_pdf(self, value):
        if value.size > settings.MAX_BOOK_UPLOAD_SIZE:
            max_mb = settings.MAX_BOOK_UPLOAD_SIZE / (1024 * 1024)
            raise serializers.ValidationError(
                f"O arquivo enviado é muito grande. O tamanho máximo permitido é de {max_mb:.1f}MB."
            )
        return value