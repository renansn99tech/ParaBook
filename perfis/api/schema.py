"""Contrato dos agregados de perfil retornados por APIViews."""

from rest_framework import serializers


class OnboardingAdiadoSerializer(serializers.Serializer):
    onboarding_lembretes = serializers.IntegerField(min_value=0, max_value=2)


class EventoPerfilSerializer(serializers.Serializer):
    id = serializers.CharField()
    tipo = serializers.CharField()
    titulo = serializers.CharField()
    descricao = serializers.CharField()
    data = serializers.DateTimeField()
    link = serializers.CharField()
    metadados = serializers.JSONField()


class EventosRecentesSerializer(serializers.Serializer):
    livros = EventoPerfilSerializer(many=True)
    avaliacoes = EventoPerfilSerializer(many=True)


class HistoricoPerfilResponseSerializer(serializers.Serializer):
    eventos = EventoPerfilSerializer(many=True)
    total = serializers.IntegerField()
    recentes = EventosRecentesSerializer()


class ResumoLeituraResponseSerializer(serializers.Serializer):
    leitura_destaque = serializers.JSONField(allow_null=True)
    metricas = serializers.JSONField()
    generos = serializers.ListField(child=serializers.JSONField())
    postagens_relevantes = serializers.ListField(child=serializers.JSONField())
    criterios = serializers.DictField(child=serializers.CharField())


class InicioPersonalizadoResponseSerializer(serializers.Serializer):
    papel = serializers.CharField()
    descobertas = serializers.ListField(child=serializers.JSONField())
    criterio_descobertas = serializers.CharField()
    proxima_acao = serializers.JSONField()


class PerfilPublicoResponseSerializer(serializers.Serializer):
    is_owner = serializers.BooleanField()
    acesso = serializers.JSONField()
    usuario = serializers.JSONField()
    perfil = serializers.JSONField()
    dados_pessoais = serializers.JSONField(required=False)
    estatisticas = serializers.JSONField(required=False)
    favoritos = serializers.JSONField(required=False)
    ultimo_lido = serializers.JSONField(required=False)
    leitura_em_andamento = serializers.JSONField(required=False, allow_null=True)
    historico = serializers.ListField(child=serializers.JSONField(), required=False)
    comunidades = serializers.ListField(child=serializers.JSONField(), required=False)
    interesses = serializers.JSONField(required=False)
    comunidades_em_comum = serializers.ListField(child=serializers.IntegerField(), required=False)
    obras = serializers.ListField(child=serializers.JSONField(), required=False)


class SolicitarAutorResponseSerializer(serializers.Serializer):
    detail = serializers.CharField()
    tipo = serializers.CharField()


class AutorResumoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    username = serializers.CharField()
    nome = serializers.CharField()
    foto = serializers.CharField(allow_null=True)
    biografia = serializers.CharField(allow_blank=True)
    total_obras = serializers.IntegerField()
