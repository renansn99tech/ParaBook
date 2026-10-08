"""Contratos G3; segredos de protocolo só no corpo, nunca em URL ou resposta."""
from datetime import timedelta

from django.db import connection, transaction
from django.db.models import Case, IntegerField, Q, Value, When
from django.utils import timezone
from django.utils.crypto import salted_hmac
from drf_spectacular.utils import extend_schema
from rest_framework import serializers
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import BaseThrottle
from rest_framework.views import APIView

from dashboard.api.permissions import IsParaBookAdmin
from usuarios import moderacao as dominio
from usuarios.models_moderacao import CalendarioModeracao, CasoModeracao, LimiteModeracao


class EntradaPublicaSerializer(serializers.Serializer):
    categoria = serializers.ChoiceField(choices=dominio.CATEGORIAS[:-1])
    relato = serializers.CharField(min_length=20, max_length=4000)
    referencia = serializers.CharField(max_length=500)
    contato = serializers.EmailField(required=False, allow_blank=True)
    titularidade = serializers.CharField(max_length=1000, required=False, allow_blank=True)
    evidencia = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    risco_imediato = serializers.BooleanField(default=False)
    chave_idempotencia = serializers.UUIDField()
    segredo = serializers.RegexField(r'^[a-f0-9]{64}$', write_only=True)
    website = serializers.CharField(required=False, allow_blank=True, max_length=200, write_only=True)

    def validate(self, dados):
        if dados.get('website'):
            raise serializers.ValidationError('Envio inválido.')
        if dados['categoria'] == 'direitos_autorais' and (not dados.get('titularidade') or not dados.get('evidencia')):
            raise serializers.ValidationError('Direitos autorais exige titularidade alegada e evidência mínima, sem documento civil.')
        return dados


class AcompanharSerializer(serializers.Serializer):
    protocolo = serializers.UUIDField()
    segredo = serializers.RegexField(r'^[a-f0-9]{64}$', write_only=True)


class ComplementarSerializer(AcompanharSerializer):
    relato = serializers.CharField(min_length=20, max_length=4000)
    chave_idempotencia = serializers.UUIDField()


class ProtocoloModeracaoSerializer(serializers.Serializer):
    protocolo = serializers.UUIDField(read_only=True)
    estado = serializers.CharField(read_only=True)
    recebido_em = serializers.DateTimeField(read_only=True)
    confirmado_em = serializers.DateTimeField(read_only=True, allow_null=True)
    decidido_em = serializers.DateTimeField(read_only=True, allow_null=True)
    resposta = serializers.CharField(read_only=True)
    retorno_estado = serializers.CharField(read_only=True)
    encerrado_em = serializers.DateTimeField(read_only=True, allow_null=True)
    pode_complementar = serializers.BooleanField(read_only=True)


class OperacaoCasoSerializer(serializers.Serializer):
    acao = serializers.ChoiceField(choices=dominio.ACOES)
    chave_idempotencia = serializers.UUIDField()
    prioridade = serializers.ChoiceField(choices=['P0', 'P1', 'P2'], required=False)
    calendario_id = serializers.IntegerField(min_value=1, required=False)
    resposta = serializers.CharField(min_length=20, max_length=4000, required=False)
    regra = serializers.CharField(min_length=3, max_length=200, required=False)
    evidencia_ref = serializers.CharField(min_length=3, max_length=200, required=False)
    motivo = serializers.CharField(min_length=20, max_length=2000, required=False)
    senha_atual = serializers.CharField(write_only=True, max_length=128, required=False)
    medida = serializers.ChoiceField(choices=['orientacao', 'arquivamento', 'restricao_conteudo', 'suspensao_conta'], required=False)
    duracao_dias = serializers.ChoiceField(choices=[3, 7, 15, 30], required=False)
    alvo_tipo = serializers.ChoiceField(choices=['livro', 'comunidade', 'conta'], required=False)
    alvo_id = serializers.IntegerField(min_value=1, required=False)
    acolher = serializers.BooleanField(required=False)
    conselho_acao = serializers.ChoiceField(choices=['remover', 'restaurar'], required=False)
    pedido = serializers.UUIDField(required=False)

    def validate(self, dados):
        obrigatorios = {
            'triagem': ['prioridade'], 'confirmar': ['resposta'], 'complemento': ['resposta'],
            'decidir': ['resposta', 'regra', 'evidencia_ref', 'medida', 'senha_atual'],
            'recurso_decidir': ['resposta', 'regra', 'evidencia_ref', 'acolher', 'senha_atual'],
            'conselho_solicitar': ['conselho_acao', 'motivo', 'senha_atual'],
            'conselho_aprovar': ['pedido', 'motivo', 'senha_atual'],
            'conselho_executar': ['pedido', 'motivo', 'resposta', 'regra', 'evidencia_ref', 'senha_atual'],
            'conselho_cancelar': ['pedido', 'motivo', 'senha_atual'],
        }.get(dados['acao'], [])
        if dados.get('medida') == 'suspensao_conta':
            obrigatorios.append('duracao_dias')
        if 'alvo_tipo' in dados or 'alvo_id' in dados:
            obrigatorios.extend(['alvo_tipo', 'alvo_id'])
        faltantes = [campo for campo in obrigatorios if campo not in dados]
        if faltantes:
            raise serializers.ValidationError({campo: 'Campo obrigatório para esta ação.' for campo in faltantes})
        return dados


class CalendarioSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    inicio = serializers.DateField()
    fim = serializers.DateField()
    feriados = serializers.ListField(child=serializers.DateField(), max_length=100)
    referencia = serializers.CharField(min_length=10, max_length=200)
    senha_atual = serializers.CharField(write_only=True, max_length=128)


class RecursoCasoSerializer(serializers.Serializer):
    protocolo = serializers.UUIDField()
    fundamento = serializers.CharField(min_length=20, max_length=2000)
    chave_idempotencia = serializers.UUIDField()


class CasoOperacionalSerializer(ProtocoloModeracaoSerializer):
    id = serializers.IntegerField(read_only=True)
    origem = serializers.CharField(read_only=True)
    categoria = serializers.CharField(read_only=True)
    prioridade = serializers.CharField(read_only=True)
    responsavel = serializers.IntegerField(read_only=True, allow_null=True)
    decisor = serializers.IntegerField(read_only=True, allow_null=True)
    prazos = serializers.JSONField(read_only=True)
    regra = serializers.CharField(read_only=True)
    evidencia_ref = serializers.CharField(read_only=True)
    medida = serializers.CharField(read_only=True)
    dados_atendimento = serializers.JSONField(read_only=True)
    alvo_livro = serializers.IntegerField(read_only=True, allow_null=True)
    alvo_comunidade = serializers.IntegerField(read_only=True, allow_null=True)
    alvo_usuario = serializers.IntegerField(read_only=True, allow_null=True)
    eventos = serializers.JSONField(read_only=True)
    conselho = serializers.JSONField(read_only=True)
    conselho_membros_configurados = serializers.IntegerField(read_only=True)
    operador_admin = serializers.BooleanField(read_only=True)
    operador_conselho = serializers.BooleanField(read_only=True)


class MeusCasosSerializer(ProtocoloModeracaoSerializer):
    medida = serializers.CharField(read_only=True)
    pode_recorrer = serializers.BooleanField(read_only=True)


class FilaCasosSerializer(serializers.Serializer):
    resultados = CasoOperacionalSerializer(many=True)
    total = serializers.IntegerField()
    pagina = serializers.IntegerField()


class SincronizacaoSerializer(serializers.Serializer):
    criados = serializers.IntegerField(read_only=True)
    protocolo = serializers.UUIDField(read_only=True, required=False)


class PrepararFilaSerializer(serializers.Serializer):
    acao = serializers.ChoiceField(choices=['sincronizar', 'preparar_conselho'], default='sincronizar')
    alvo_tipo = serializers.ChoiceField(choices=['livro', 'comunidade', 'conta'], required=False)
    alvo_id = serializers.IntegerField(min_value=1, required=False)
    motivo = serializers.CharField(min_length=20, max_length=2000, required=False)
    senha_atual = serializers.CharField(write_only=True, max_length=128, required=False)
    chave_idempotencia = serializers.UUIDField(required=False)

    def validate(self, dados):
        if dados['acao'] == 'preparar_conselho':
            faltantes = [campo for campo in ('alvo_tipo', 'alvo_id', 'motivo', 'senha_atual', 'chave_idempotencia') if campo not in dados]
            if faltantes:
                raise serializers.ValidationError({campo: 'Campo obrigatório.' for campo in faltantes})
        return dados


class LimitePublicoModeracao(BaseThrottle):
    """Limite compartilhado por origem de rede. Não confia em X-Forwarded-For livre."""
    limite = 10

    def allow_request(self, request, view):
        janela = timezone.now().replace(minute=0, second=0, microsecond=0)
        chave = salted_hmac('g3-limite', f'{request.META.get("REMOTE_ADDR", "desconhecida")}:{view.__class__.__name__}:{janela.isoformat()}', algorithm='sha256').hexdigest()
        with transaction.atomic():
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_xact_lock(%s)', [int(chave[:15], 16)])
            registro, _ = LimiteModeracao.objects.get_or_create(chave=chave, defaults={'janela': janela})
            if registro.tentativas >= self.limite:
                return False
            registro.tentativas += 1
            registro.save(update_fields=['tentativas'])
        self.espera = max(1, (janela + timedelta(hours=1) - timezone.now()).total_seconds())
        return True

    def wait(self):
        return getattr(self, 'espera', 3600)


class LimiteConsultaModeracao(LimitePublicoModeracao):
    limite = 60


def validar(serializer_class, request):
    serializer = serializer_class(data=request.data)
    serializer.is_valid(raise_exception=True)
    return serializer.validated_data


def resposta_dados(dados, status=200):
    return Response(dados, status=status, headers={'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer'})


class DenunciaPublicaAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LimitePublicoModeracao]

    @extend_schema(request=EntradaPublicaSerializer, responses={201: ProtocoloModeracaoSerializer})
    def post(self, request):
        caso = dominio.receber_publica(validar(EntradaPublicaSerializer, request))
        return resposta_dados(dominio.dados_publicos(caso), 201)


class AcompanhamentoPublicoAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LimiteConsultaModeracao]

    @extend_schema(request=AcompanharSerializer, responses=ProtocoloModeracaoSerializer)
    def post(self, request):
        dados = validar(AcompanharSerializer, request)
        caso = dominio.consultar_publica(dados['protocolo'], dados['segredo'])
        # Consulta autenticada pelo segredo é evidência de visualização, não e-mail enviado.
        if caso.retorno_estado == 'disponivel':
            CasoModeracao.objects.filter(pk=caso.pk, retorno_estado='disponivel').update(retorno_estado='consultado')
            caso.retorno_estado = 'consultado'
        return resposta_dados(dominio.dados_publicos(caso))


class ComplementoPublicoAPIView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LimitePublicoModeracao]

    @extend_schema(request=ComplementarSerializer, responses=ProtocoloModeracaoSerializer)
    def post(self, request):
        caso = dominio.complementar_publica(validar(ComplementarSerializer, request))
        return resposta_dados(dominio.dados_publicos(caso))


class MeusCasosAPIView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=MeusCasosSerializer(many=True))
    def get(self, request):
        casos = CasoModeracao.objects.filter(Q(usuario=request.user) | Q(alvo_usuario=request.user)).order_by('-recebido_em')[:100]
        return resposta_dados([{**dominio.dados_publicos(caso), 'medida': caso.medida,
            'pode_recorrer': caso.alvo_usuario_id == request.user.pk and caso.medida in {'suspensao_conta', 'remocao_definitiva'}
                            and caso.decidido_em is not None and not hasattr(caso, 'recurso')} for caso in casos])

    @extend_schema(request=RecursoCasoSerializer, responses={201: ProtocoloModeracaoSerializer})
    def post(self, request):
        dados = validar(RecursoCasoSerializer, request)
        caso = dominio.recorrer_caso(request.user, dados['protocolo'], dados)
        return resposta_dados(dominio.dados_publicos(caso), 201)


class CasosAdminAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    @extend_schema(responses=FilaCasosSerializer)
    def get(self, request):
        casos = CasoModeracao.objects.select_related('responsavel', 'decisor').annotate(
            ordem_prioridade=Case(When(prioridade='P0', then=Value(0)), When(prioridade='P1', then=Value(1)),
                When(prioridade='', then=Value(2)), default=Value(3), output_field=IntegerField())
        ).order_by('ordem_prioridade', 'recebido_em', 'pk')
        if not dominio.eh_gestor_moderacao(request.user):
            casos = casos.exclude(prioridade__in=['P0', 'P1'])
        estado = request.query_params.get('estado')
        if estado and estado != 'todos':
            if estado not in dict(CasoModeracao.ESTADOS):
                raise serializers.ValidationError('Estado inválido.')
            casos = casos.filter(estado=estado)
        elif not estado:
            casos = casos.exclude(estado='encerrado')
        pagina = serializers.IntegerField(min_value=1, max_value=1000000).run_validation(request.query_params.get('pagina', 1))
        inicio = (pagina - 1) * 50
        return resposta_dados({'resultados': [dominio.dados_operacionais(caso, request.user) for caso in casos[inicio:inicio + 50]],
                              'total': casos.count(), 'pagina': pagina})

    @extend_schema(request=PrepararFilaSerializer, responses=SincronizacaoSerializer)
    def post(self, request):
        dados = validar(PrepararFilaSerializer, request)
        if dados['acao'] == 'preparar_conselho':
            caso = dominio.preparar_conselho(request.user, dados)
            return resposta_dados({'criados': 1, 'protocolo': caso.protocolo})
        return resposta_dados({'criados': dominio.sincronizar_origens(request.user)})


class CasoAdminAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    @extend_schema(operation_id='moderacao_operar_caso', request=OperacaoCasoSerializer, responses=CasoOperacionalSerializer)
    def post(self, request, protocolo):
        caso = dominio.operar_caso(request.user, protocolo, validar(OperacaoCasoSerializer, request))
        return resposta_dados(dominio.dados_operacionais(caso, request.user))


class CalendariosAdminAPIView(APIView):
    permission_classes = [IsParaBookAdmin]

    @extend_schema(responses=CalendarioSerializer(many=True))
    def get(self, request):
        return resposta_dados(list(CalendarioModeracao.objects.order_by('-pk').values('id', 'inicio', 'fim', 'feriados', 'referencia')[:30]))

    @extend_schema(request=CalendarioSerializer, responses={201: CalendarioSerializer})
    def post(self, request):
        calendario = dominio.conferir_calendario(request.user, validar(CalendarioSerializer, request))
        return resposta_dados(CalendarioSerializer(calendario).data, 201)
