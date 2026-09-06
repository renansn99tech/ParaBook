from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers, viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from biblioteca import publicacao as fluxo
from biblioteca.models import (
    BloqueioPublicacao, Denuncia, EventoPublicacao, Livro, RecursoPublicacao, TentativaPublicacao,
)
from biblioteca.validators import validar_pdf_livro
from dashboard.api.permissions import IsParaBookAdmin
from usuarios.api.throttles import UploadRateThrottle
from usuarios.permissions import eh_admin_parabook
from .serializers import LivroSerializer


class AutorAprovado(permissions.BasePermission):
    def has_permission(self, request, view):
        fluxo.exigir_autor(request.user)
        return True


class RevisaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Livro
        fields = ['titulo', 'categoria', 'paginas', 'ano_publicacao', 'isbn', 'edicao', 'capa', 'pdf']

    def validate_pdf(self, value):
        return validar_pdf_livro(value)

    def validate(self, attrs):
        if not attrs:
            raise serializers.ValidationError('Informe pelo menos uma alteração.')
        if attrs.get('pdf', True) is None:
            raise serializers.ValidationError({'pdf': 'O PDF não pode ser removido por edição.'})
        return attrs


class EventoSerializer(serializers.ModelSerializer):
    pode_recorrer = serializers.SerializerMethodField()
    recurso_status = serializers.SerializerMethodField()

    class Meta:
        model = EventoPublicacao
        fields = ['id', 'protocolo', 'acao', 'anterior', 'posterior', 'motivo', 'criado_em', 'pode_recorrer', 'recurso_status']

    def get_pode_recorrer(self, obj):
        return obj.acao in {'rejeitada', 'suspensa', 'denuncia_acolhida'} and not hasattr(obj, 'recurso')

    def get_recurso_status(self, obj):
        return obj.recurso.status if hasattr(obj, 'recurso') else None


class PublicacaoPagination(PageNumberPagination):
    page_size = 20


class MinhasPublicacoesViewSet(viewsets.ReadOnlyModelViewSet):
    pagination_class = PublicacaoPagination
    permission_classes = [AutorAprovado]
    serializer_class = LivroSerializer
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Livro.objects.filter(solicitacao_publicacao__usuario=self.request.user).select_related('categoria')

    @action(detail=False, methods=['get'])
    def disponibilidade(self, request):
        bloqueio = BloqueioPublicacao.objects.filter(usuario=request.user).first()
        return Response({'novas_obras_apos': bloqueio.novas_obras_apos if bloqueio else None})

    @action(detail=True, methods=['get'])
    def historico(self, request, pk=None):
        livro = self.get_object()
        eventos = livro.historico_publicacao.select_related('recurso').all()
        pagina = self.paginate_queryset(eventos)
        return self.get_paginated_response(EventoSerializer(pagina, many=True).data)

    @action(detail=True, methods=['get'])
    def versoes(self, request, pk=None):
        livro = self.get_object()
        tentativas = livro.solicitacao_publicacao.tentativas.all()
        pagina = self.paginate_queryset(tentativas)
        return self.get_paginated_response([{
            'id': t.pk, 'status': t.status, 'dados': t.dados, 'motivo': t.motivo,
            'criada_em': t.criada_em, 'analisada_em': t.analisada_em,
        } for t in pagina])

    @action(detail=True, methods=['post'])
    def retirar(self, request, pk=None):
        fluxo.retirar_obra(request.user, self.get_object().pk)
        return Response({'detail': 'Obra retirada. Novas obras poderão ser enviadas após 24 horas.'})

    @action(detail=True, methods=['post'], throttle_classes=[UploadRateThrottle])
    def revisar(self, request, pk=None):
        livro = self.get_object()
        serializer = RevisaoSerializer(livro, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        tentativa = fluxo.enviar_revisao(request.user, livro.pk, serializer.validated_data)
        return Response({'id': tentativa.pk, 'status': tentativa.status}, status=201)

    @action(detail=True, methods=['post'], throttle_classes=[UploadRateThrottle])
    def reenviar(self, request, pk=None):
        livro = self.get_object()
        serializer = RevisaoSerializer(livro, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        tentativa = fluxo.enviar_revisao(request.user, livro.pk, serializer.validated_data, reenviar=True)
        return Response({'id': tentativa.pk, 'status': tentativa.status}, status=201)

    @action(detail=True, methods=['post'])
    def recurso(self, request, pk=None):
        livro = self.get_object()
        entrada = RecursoEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        evento = get_object_or_404(EventoPublicacao, livro=livro, pk=entrada.validated_data['evento'])
        recurso = fluxo.recorrer(request.user, evento.pk, entrada.validated_data['fundamento'])
        return Response({'id': recurso.pk, 'status': recurso.status}, status=201)


class RecursoEntradaSerializer(serializers.Serializer):
    evento = serializers.IntegerField(min_value=1)
    fundamento = serializers.CharField(max_length=2000)


class DenunciaEntradaSerializer(serializers.Serializer):
    livro = serializers.IntegerField(min_value=1)
    motivo = serializers.CharField(max_length=150)
    evidencias = serializers.CharField(max_length=4000)
    referencia_externa = serializers.CharField(max_length=200, required=False, default='')


class DenunciaObraAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [UploadRateThrottle]

    def post(self, request):
        entrada = DenunciaEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data
        denuncia = fluxo.denunciar(request.user, dados.pop('livro'), **dados)
        return Response({'protocolo': denuncia.protocolo, 'status': denuncia.status}, status=201)

    def get(self, request):
        # Sem identidade/evidências de terceiros no acompanhamento do denunciante.
        return Response(list(Denuncia.objects.filter(usuario=request.user).values(
            'protocolo', 'livro_id', 'status', 'data_denuncia',
        )[:100]))


class RevisaoAdminAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def get(self, request, solicitacao_id):
        tentativa = get_object_or_404(TentativaPublicacao.objects.order_by('-id'), solicitacao_id=solicitacao_id, status='pendente')
        if request.query_params.get('arquivo') == 'pdf':
            if not tentativa.pdf:
                return Response({'detail': 'PDF não disponível.'}, status=404)
            response = FileResponse(tentativa.pdf.open('rb'), content_type='application/pdf')
            response['Cache-Control'] = 'private, no-store'
            return response
        return Response({'id': tentativa.pk, 'dados': tentativa.dados, 'status': tentativa.status,
                         'criada_em': tentativa.criada_em, 'pdf_disponivel': bool(tentativa.pdf)})


class RecursosAdminAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    def get(self, request):
        return Response([{
            'id': r.pk, 'livro_id': r.evento.livro_id, 'titulo': r.evento.livro.titulo,
            'fundamento': r.fundamento, 'evento': EventoSerializer(r.evento).data,
            'mesmo_revisor': r.evento.ator_id == request.user.pk,
        } for r in RecursoPublicacao.objects.filter(status='pendente').select_related('evento__livro')[:100]])

    def post(self, request):
        entrada = DecisaoRecursoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data
        recurso = fluxo.analisar_recurso(request.user, dados['id'], dados['acao'] == 'acolher', dados['motivo'])
        return Response({'id': recurso.pk, 'status': recurso.status})


class DecisaoRecursoSerializer(serializers.Serializer):
    id = serializers.IntegerField(min_value=1)
    acao = serializers.ChoiceField(choices=['acolher', 'recusar'])
    motivo = serializers.CharField(max_length=2000)
