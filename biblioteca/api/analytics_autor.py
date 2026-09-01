import csv
import io
from datetime import datetime, time, timedelta

from django.db.models import Avg, Count, Q
from django.db.models.functions import TruncDate
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView

from biblioteca.models import Biblioteca, EventoLeitura, Livro
from biblioteca.services import verificar_acesso_obra


PERIODOS_VALIDOS = {7, 30, 90}
TITULOS_PERIODO = {
    7: 'Últimos 7 dias',
    30: 'Últimos 30 dias',
    90: 'Últimos 90 dias',
}
DIAS_SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']


class EhAutorOuAdmin(permissions.BasePermission):
    message = 'Apenas autores aprovados podem acessar este painel.'

    def has_permission(self, request, view):
        perfil = getattr(request.user, 'perfil_customizado', None)
        return bool(
            request.user
            and request.user.is_authenticated
            and perfil
            and perfil.tipo in {'autor', 'admin'}
        )


class EventoLeituraEntradaSerializer(serializers.Serializer):
    livro = serializers.IntegerField(min_value=1)
    pagina = serializers.IntegerField(min_value=0)
    sessao_id = serializers.UUIDField()
    duracao_segundos = serializers.IntegerField(min_value=0, max_value=1800, default=0)


def _periodo(request):
    try:
        periodo = int(request.query_params.get('periodo', 30))
    except (TypeError, ValueError):
        periodo = 0
    if periodo not in PERIODOS_VALIDOS:
        raise serializers.ValidationError({'periodo': 'Use 7, 30 ou 90 dias.'})
    return periodo


def _inicio_periodo(periodo):
    hoje = timezone.localdate()
    data_inicial = hoje - timedelta(days=periodo - 1)
    return timezone.make_aware(datetime.combine(data_inicial, time.min)), hoje


def _obras_do_autor(user):
    return (
        Livro.objects.filter(solicitacao_publicacao__usuario=user)
        .select_related('categoria', 'solicitacao_publicacao')
        .distinct()
    )


def _obras_publicadas(user):
    return _obras_do_autor(user).filter(
        status='publicado',
        solicitacao_publicacao__status='aprovado',
    )


def _calcular_delta(atual, anterior):
    if not anterior:
        if not atual:
            return 'estável', 'estavel', 0
        return '+100%', 'alta', 100
    percentual = round(((atual - anterior) / anterior) * 100)
    if percentual == 0:
        return 'estável', 'estavel', 0
    sinal = '+' if percentual > 0 else '−'
    return f'{sinal}{abs(percentual)}%', 'alta' if percentual > 0 else 'queda', percentual


def _delta_nota(atual, anterior):
    if atual is None or anterior is None:
        return 'estável'
    diferenca = float(atual) - float(anterior)
    if abs(diferenca) < 0.05:
        return 'estável'
    sinal = '+' if diferenca > 0 else '−'
    return f'{sinal}{abs(diferenca):.1f}'


def _serie_eventos(eventos, periodo, inicio, hoje):
    contagens = {
        item['dia']: item['valor']
        for item in eventos.annotate(
            dia=TruncDate('criado_em', tzinfo=timezone.get_current_timezone()),
        ).values('dia').annotate(
            valor=Count('sessao_id', distinct=True),
        ).order_by('dia')
    }
    data_inicial = inicio.date()

    if periodo == 7:
        return [
            {
                'rotulo': DIAS_SEMANA[(data_inicial + timedelta(days=indice)).weekday()],
                'valor': contagens.get(data_inicial + timedelta(days=indice), 0),
            }
            for indice in range(7)
        ]

    quantidade_blocos = 4 if periodo == 30 else 3
    tamanho_bloco = 7 if periodo == 30 else 30
    valores = [0] * quantidade_blocos
    for data, valor in contagens.items():
        indice = min((data - data_inicial).days // tamanho_bloco, quantidade_blocos - 1)
        if indice >= 0:
            valores[indice] += valor
    prefixo = 'sem' if periodo == 30 else 'mês'
    return [
        {'rotulo': f'{prefixo} {indice + 1}', 'valor': valor}
        for indice, valor in enumerate(valores)
    ]


def _nome_publico(user):
    perfil = getattr(user, 'perfil_customizado', None)
    nome = ((getattr(perfil, 'nome', '') or user.get_full_name() or user.username).strip())
    partes = nome.split()
    return f'{partes[0]} {partes[-1][0]}.' if len(partes) > 1 else nome


def _status_obra(livro):
    solicitacao = livro.solicitacao_publicacao
    if livro.status == 'publicado' and solicitacao.status == 'aprovado':
        return 'Publicado'
    if livro.status == 'pendente' or solicitacao.status == 'pendente':
        return 'Em revisão'
    if livro.status == 'rejeitado' or solicitacao.status == 'rejeitado':
        return 'Rejeitado'
    return 'Indisponível'


class EventoLeituraCreateAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        entrada = EventoLeituraEntradaSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        dados = entrada.validated_data
        livro = get_object_or_404(Livro.objects.filter(status='publicado'), pk=dados['livro'])
        decisao = verificar_acesso_obra(request.user, livro)
        if not decisao.pode_ler:
            return Response(
                {'detail': decisao.mensagem, 'codigo': decisao.codigo},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not Biblioteca.objects.filter(user=request.user, livro=livro).exists():
            return Response(
                {'detail': 'Adicione a obra à sua estante antes de registrar a leitura.'},
                status=status.HTTP_409_CONFLICT,
            )

        pagina = dados['pagina']
        if livro.paginas:
            pagina = min(pagina, livro.paginas)
            percentual = min(100, round((pagina / livro.paginas) * 100))
        else:
            percentual = 0

        evento = EventoLeitura.objects.create(
            livro=livro,
            usuario=request.user,
            sessao_id=dados['sessao_id'],
            pagina=pagina,
            percentual=percentual,
            duracao_segundos=dados['duracao_segundos'],
        )
        return Response(
            {'id': evento.pk, 'percentual': evento.percentual},
            status=status.HTTP_201_CREATED,
        )


class AnalyticsAutorResumoAPIView(APIView):
    permission_classes = [EhAutorOuAdmin]

    def get(self, request, *args, **kwargs):
        periodo = _periodo(request)
        inicio, hoje = _inicio_periodo(periodo)
        inicio_anterior = inicio - timedelta(days=periodo)
        obras = _obras_do_autor(request.user)
        publicadas = _obras_publicadas(request.user)
        publicadas_ids = list(publicadas.values_list('id', flat=True))

        eventos = EventoLeitura.objects.filter(
            livro_id__in=publicadas_ids,
            criado_em__gte=inicio,
        )
        eventos_anteriores = EventoLeitura.objects.filter(
            livro_id__in=publicadas_ids,
            criado_em__gte=inicio_anterior,
            criado_em__lt=inicio,
        )
        leituras = eventos.values('sessao_id').distinct().count()
        leituras_anteriores = eventos_anteriores.values('sessao_id').distinct().count()
        leitores = eventos.exclude(usuario__isnull=True).values('usuario_id').distinct().count()
        leitores_anteriores = eventos_anteriores.exclude(usuario__isnull=True).values('usuario_id').distinct().count()

        favoritos_base = Biblioteca.objects.filter(
            livro_id__in=publicadas_ids,
            favorito=True,
            favoritado_em__isnull=False,
        )
        favoritos = favoritos_base.filter(favoritado_em__gte=inicio).count()
        favoritos_anteriores = favoritos_base.filter(
            favoritado_em__gte=inicio_anterior,
            favoritado_em__lt=inicio,
        ).count()

        avaliacoes_base = Biblioteca.objects.filter(
            livro_id__in=publicadas_ids,
            nota__isnull=False,
        )
        nota_media = avaliacoes_base.aggregate(valor=Avg('nota'))['valor']
        nota_periodo = avaliacoes_base.filter(avaliada_em__gte=inicio).aggregate(valor=Avg('nota'))['valor']
        nota_anterior = avaliacoes_base.filter(
            avaliada_em__gte=inicio_anterior,
            avaliada_em__lt=inicio,
        ).aggregate(valor=Avg('nota'))['valor']

        delta_leituras, direcao, tendencia_valor = _calcular_delta(leituras, leituras_anteriores)
        delta_leitores, _, _ = _calcular_delta(leitores, leitores_anteriores)
        delta_favoritos, _, _ = _calcular_delta(favoritos, favoritos_anteriores)

        obras_payload = []
        obras_com_metricas = obras.annotate(
            leituras_periodo=Count(
                'eventos_leitura__sessao_id',
                filter=Q(eventos_leitura__criado_em__gte=inicio),
                distinct=True,
            ),
            favoritos_total=Count(
                'usuarios_interagiram',
                filter=Q(usuarios_interagiram__favorito=True),
                distinct=True,
            ),
            nota_media_leitores=Avg('usuarios_interagiram__nota'),
        )
        for livro in obras_com_metricas:
            obras_payload.append({
                'id': livro.id,
                'titulo': livro.titulo,
                'status': _status_obra(livro),
                'detalhe': ' · '.join(filter(None, [
                    livro.categoria.nome if livro.categoria_id else None,
                    str(livro.ano_publicacao) if livro.ano_publicacao else None,
                ])) or 'Dados editoriais em atualização',
                'leituras': livro.leituras_periodo,
                'favoritos': livro.favoritos_total,
                'nota': f'{float(livro.nota_media_leitores):.1f}' if livro.nota_media_leitores is not None else None,
            })

        comentarios = []
        comentarios_qs = (
            Biblioteca.objects.filter(livro_id__in=publicadas_ids)
            .exclude(resenha__isnull=True)
            .exclude(resenha='')
            .select_related('user', 'user__perfil_customizado', 'livro')
            .order_by('-avaliada_em', '-data_adicao')[:3]
        )
        for item in comentarios_qs:
            comentarios.append({
                'id': item.id,
                'autor': _nome_publico(item.user),
                'obra_id': item.livro_id,
                'obra': item.livro.titulo,
                'texto': item.resenha,
                'quando': item.avaliada_em or item.data_adicao,
            })

        return Response({
            'periodo': periodo,
            'titulo_periodo': TITULOS_PERIODO[periodo],
            'total_publicadas': len(publicadas_ids),
            'total_obras': len(obras_payload),
            'historico_parcial': eventos.filter(origem=EventoLeitura.Origem.BACKFILL).exists(),
            'tendencia': {
                'valor': tendencia_valor,
                'rotulo': f'{delta_leituras} vs. período anterior' if delta_leituras != 'estável' else 'estável vs. período anterior',
                'direcao': direcao,
            },
            'kpis': {
                'leituras': {'valor': leituras, 'delta': delta_leituras},
                'leitores_unicos': {'valor': leitores, 'delta': delta_leitores},
                'novos_favoritos': {'valor': favoritos, 'delta': delta_favoritos},
                'nota_media': {
                    'valor': f'{float(nota_media):.1f}' if nota_media is not None else None,
                    'delta': _delta_nota(nota_periodo, nota_anterior),
                },
            },
            'serie': _serie_eventos(eventos, periodo, inicio, hoje),
            'obras': obras_payload,
            'comentarios': comentarios,
            'analytics_avancado': False,
            'analytics_avancado_em_breve': True,
        })


def _valor_csv_seguro(valor):
    texto = str(valor or '')
    return f"'{texto}" if texto.startswith(('=', '+', '-', '@')) else texto


class AnalyticsAutorExportarAPIView(APIView):
    permission_classes = [EhAutorOuAdmin]

    def get(self, request, *args, **kwargs):
        periodo = _periodo(request)
        inicio, _hoje = _inicio_periodo(periodo)
        obras = _obras_publicadas(request.user)
        obra_id = request.query_params.get('obra')
        if obra_id and obra_id != 'todas':
            obra = get_object_or_404(obras, pk=obra_id)
            obras = obras.filter(pk=obra.pk)
        ids = list(obras.values_list('id', flat=True))

        linhas = {}
        eventos = (
            EventoLeitura.objects.filter(livro_id__in=ids, criado_em__gte=inicio)
            .annotate(data=TruncDate('criado_em', tzinfo=timezone.get_current_timezone()))
            .values('data', 'livro_id', 'livro__titulo')
            .annotate(
                leituras=Count('sessao_id', distinct=True),
                leitores_unicos=Count('usuario_id', distinct=True),
            )
        )
        for item in eventos:
            chave = (item['data'], item['livro_id'])
            linhas[chave] = {
                'data': item['data'],
                'obra': item['livro__titulo'],
                'leituras': item['leituras'],
                'leitores_unicos': item['leitores_unicos'],
                'favoritos': 0,
                'conclusoes': 0,
            }

        favoritos = (
            Biblioteca.objects.filter(
                livro_id__in=ids,
                favorito=True,
                favoritado_em__gte=inicio,
            )
            .annotate(data=TruncDate('favoritado_em', tzinfo=timezone.get_current_timezone()))
            .values('data', 'livro_id', 'livro__titulo')
            .annotate(total=Count('id'))
        )
        conclusoes = (
            Biblioteca.objects.filter(livro_id__in=ids, data_conclusao__gte=inicio)
            .annotate(data=TruncDate('data_conclusao', tzinfo=timezone.get_current_timezone()))
            .values('data', 'livro_id', 'livro__titulo')
            .annotate(total=Count('id'))
        )
        for campo, consulta in [('favoritos', favoritos), ('conclusoes', conclusoes)]:
            for item in consulta:
                chave = (item['data'], item['livro_id'])
                linhas.setdefault(chave, {
                    'data': item['data'],
                    'obra': item['livro__titulo'],
                    'leituras': 0,
                    'leitores_unicos': 0,
                    'favoritos': 0,
                    'conclusoes': 0,
                })[campo] = item['total']

        buffer = io.StringIO(newline='')
        escritor = csv.writer(buffer, delimiter=';', lineterminator='\r\n')
        escritor.writerow(['data', 'obra', 'leituras', 'leitores_unicos', 'favoritos', 'conclusoes'])
        for item in sorted(linhas.values(), key=lambda linha: (linha['data'], linha['obra'])):
            escritor.writerow([
                item['data'].isoformat(),
                _valor_csv_seguro(item['obra']),
                item['leituras'],
                item['leitores_unicos'],
                item['favoritos'],
                item['conclusoes'],
            ])

        resposta = HttpResponse(buffer.getvalue().encode('utf-8-sig'), content_type='text/csv; charset=utf-8')
        resposta['Content-Disposition'] = f'attachment; filename="painel-autor-{periodo}-dias.csv"'
        return resposta
