from rest_framework import serializers
from django.conf import settings
from assinaturas.models import Plano, Assinatura


class PlanoSerializer(serializers.ModelSerializer):
    contratacao_disponivel = serializers.SerializerMethodField()
    motivo_indisponibilidade = serializers.SerializerMethodField()

    def get_contratacao_disponivel(self, obj) -> bool:
        return obj.preco == 0 or settings.PAYMENTS_ENABLED

    def get_motivo_indisponibilidade(self, obj) -> str | None:
        if self.get_contratacao_disponivel(obj):
            return None
        return 'Assinaturas pagas estarão disponíveis em uma próxima etapa do ParaBook.'

    class Meta:
        model = Plano
        fields = [
            'id', 'nome', 'preco', 'limite_livros', 'anuncios',
            'contratacao_disponivel', 'motivo_indisponibilidade',
        ]


class AssinaturaSerializer(serializers.ModelSerializer):
    plano = PlanoSerializer(read_only=True)
    pagamentos_disponiveis = serializers.SerializerMethodField()

    def get_pagamentos_disponiveis(self, obj) -> bool:
        return settings.PAYMENTS_ENABLED

    class Meta:
        model = Assinatura
        fields = [
            'id', 'plano', 'ativa', 'data_inicio', 'data_fim',
            'pagamentos_disponiveis',
        ]
