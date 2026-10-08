from drf_spectacular.utils import extend_schema
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from dashboard.api.permissions import IsParaBookAdmin
from usuarios.revisao_etaria import listar_revisoes, solicitar_revisao, decidir_revisao, serializar_revisao


class RevisaoResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    protocolo = serializers.UUIDField()
    status = serializers.ChoiceField(choices=['aberta', 'em_analise', 'respondida', 'encerrada'])
    resposta = serializers.CharField(allow_blank=True)
    criada_em = serializers.DateTimeField()
    atualizada_em = serializers.DateTimeField()
    encerrada_em = serializers.DateTimeField(allow_null=True)
    decisao = serializers.CharField(allow_blank=True)


class SolicitarRevisaoSerializer(serializers.Serializer):
    mensagem = serializers.CharField(min_length=20, max_length=4000)
    chave_idempotencia = serializers.UUIDField()


class DecidirRevisaoSerializer(serializers.Serializer):
    acao = serializers.ChoiceField(choices=['iniciar', 'confirmar_declaracao', 'orientar_correcao'])
    resposta = serializers.CharField(min_length=20, max_length=4000)
    senha_atual = serializers.CharField(write_only=True, max_length=128)
    chave_idempotencia = serializers.UUIDField()


class RevisaoEtariaAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses=RevisaoResponseSerializer(many=True))
    def get(self, request):
        return Response(listar_revisoes(request.user), headers={'Cache-Control': 'no-store'})

    @extend_schema(request=SolicitarRevisaoSerializer, responses=RevisaoResponseSerializer)
    def post(self, request):
        entrada = SolicitarRevisaoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        item = solicitar_revisao(usuario=request.user, mensagem=entrada.validated_data['mensagem'],
                                 chave=entrada.validated_data['chave_idempotencia'])
        return Response(serializar_revisao(item), headers={'Cache-Control': 'no-store'})


class DecidirRevisaoEtariaAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    @extend_schema(request=DecidirRevisaoSerializer, responses=RevisaoResponseSerializer)
    def post(self, request, item_id):
        entrada = DecidirRevisaoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data
        item = decidir_revisao(ator=request.user, item_id=item_id, acao=dados['acao'],
                              resposta=dados['resposta'], senha_atual=dados['senha_atual'],
                              chave=dados['chave_idempotencia'])
        return Response(serializar_revisao(item), headers={'Cache-Control': 'no-store'})
