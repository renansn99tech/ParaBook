from rest_framework import serializers
from assinaturas.models import Plano, Assinatura

class PlanoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plano
        fields = ['id', 'nome', 'preco', 'limite_livros', 'anuncios', 'stripe_price_id']

class AssinaturaSerializer(serializers.ModelSerializer):
    plano = PlanoSerializer(read_only=True)

    class Meta:
        model = Assinatura
        fields = ['id', 'plano', 'ativa', 'data_inicio', 'data_fim']
