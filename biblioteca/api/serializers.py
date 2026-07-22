from rest_framework import serializers
from biblioteca.models import Livro, Categoria, Biblioteca
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

    def get_livro_capa(self, obj):
        if obj.livro.capa:
            return obj.livro.capa.url
        return None

class ResenhaSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.CharField(source='user.username', read_only=True)
    usuario_foto = serializers.SerializerMethodField()

    class Meta:
        model = Biblioteca
        fields = ['id', 'usuario_nome', 'usuario_foto', 'nota', 'resenha', 'data_adicao']
    
    def get_usuario_foto(self, obj):
        # Tenta pegar a foto pelo perfil do app 'perfis'
        try:
            if hasattr(obj.user, 'perfil') and obj.user.perfil.foto:
                return obj.user.perfil.foto.url
        except:
            pass
        # Fallback para o perfil do app 'biblioteca'
        try:
            if hasattr(obj.user, 'perfil_da_biblioteca') and obj.user.perfil_da_biblioteca.foto:
                return obj.user.perfil_da_biblioteca.foto.url
        except:
            pass
        return None

