from rest_framework import serializers
from biblioteca.models import Livro, Categoria

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
