from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from biblioteca import direitos
from biblioteca.models import Livro, TentativaPublicacao
from dashboard.api.permissions import IsParaBookAdmin


class DireitosEntradaSerializer(serializers.Serializer):
    acao = serializers.ChoiceField(choices=['conferir', 'revogar', 'disputa'])
    recibo = serializers.JSONField(required=False, write_only=True)
    tentativa_id = serializers.IntegerField(min_value=1, required=False)
    protocolo = serializers.UUIDField(required=False)
    senha_atual = serializers.CharField(max_length=128, write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        campo = 'recibo' if attrs['acao'] == 'conferir' else 'protocolo'
        if campo not in attrs:
            raise serializers.ValidationError({campo: 'Campo obrigatório para esta ação.'})
        return attrs


class DireitosEstadoSerializer(serializers.Serializer):
    direitos = serializers.CharField()
    seguranca_pdf = serializers.BooleanField()
    seguranca_amostra = serializers.BooleanField()
    editorial = serializers.CharField()
    conferencia_permitida = serializers.BooleanField()
    contexto_custodia = serializers.JSONField(allow_null=True)
    licencas = serializers.ListField(child=serializers.DictField())


class DireitosResultadoSerializer(serializers.Serializer):
    protocolo = serializers.UUIDField()
    estado = serializers.CharField()


def gates_edicao(livro, tentativa=None):
    from biblioteca.quarentena import arquivo_liberado
    return {
        'direitos': direitos.estado_direitos(livro, tentativa=tentativa),
        'seguranca_pdf': arquivo_liberado(tentativa.pdf if tentativa else livro.pdf, conferir_conteudo=False),
        'seguranca_amostra': arquivo_liberado(tentativa.pdf_amostra if tentativa else livro.pdf_amostra, conferir_conteudo=False),
        'editorial': tentativa.status if tentativa else livro.status,
    }


class DireitosAdminAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    @extend_schema(responses=DireitosEstadoSerializer)
    def get(self, request, livro_id):
        livro = get_object_or_404(Livro, pk=livro_id)
        tentativa = None
        if request.query_params.get('tentativa_id'):
            try:
                tentativa_id = int(request.query_params['tentativa_id'])
            except ValueError as exc:
                raise ValidationError('Versão inválida.') from exc
            tentativa = get_object_or_404(TentativaPublicacao, solicitacao__livro=livro, pk=tentativa_id)
        permitido = (request.user.has_perm('biblioteca.conferir_direitos')
                     and not livro.removido_definitivamente_em and not livro.demonstrativo)
        contexto = None
        if permitido:
            try:
                contexto = {
                    'livro_id': livro.pk, 'edicao_sha256': direitos.digest_edicao(livro, tentativa),
                    'pdf_sha256': direitos.digest_arquivo(tentativa.pdf if tentativa else livro.pdf),
                    'amostra_sha256': direitos.digest_arquivo(tentativa.pdf_amostra if tentativa else livro.pdf_amostra),
                    'origem': tentativa.dados.get('origem', livro.origem) if tentativa else livro.origem,
                }
            except (OSError, ValueError):
                permitido = False
        response = Response({**gates_edicao(livro, tentativa), 'conferencia_permitida': permitido,
            'contexto_custodia': contexto,
            'licencas': list(livro.licencas.order_by('-id').values('protocolo', 'estado', 'versao', 'vigente_de', 'vigente_ate')[:20]) if permitido else [],
        })
        response['Cache-Control'] = 'private, no-store'
        return response

    @extend_schema(request=DireitosEntradaSerializer, responses=DireitosResultadoSerializer)
    def post(self, request, livro_id):
        direitos.exigir_conferente(request.user)
        entrada = DireitosEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data
        if not request.user.check_password(dados['senha_atual']):
            raise PermissionDenied('Reautenticação necessária.')
        if dados['acao'] == 'conferir':
            licenca = direitos.conferir_direitos(request.user, livro_id, dados['recibo'], tentativa_id=dados.get('tentativa_id'))
        else:
            estado = 'revogada' if dados['acao'] == 'revogar' else 'disputa'
            licenca = direitos.restringir_direitos(request.user, livro_id, dados['protocolo'], estado)
        response = Response({'protocolo': licenca.protocolo, 'estado': licenca.estado})
        response['Cache-Control'] = 'private, no-store'
        return response
