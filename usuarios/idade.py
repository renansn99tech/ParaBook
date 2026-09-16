"""Serviço transacional para elegibilidade etária.

O estado persistido é a fonte de verdade. JWT, middleware e clientes apenas
consultam este módulo; nenhum deles calcula idade ou prazo por conta própria.
"""

from datetime import datetime, timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from usuarios.models import (
    EstadoEtarioConta,
    EventoEtarioConta,
    SolicitacaoSuporte,
    Usuario,
)


def _marco_rollout():
    valor = settings.AGE_POLICY_ROLLOUT_AT
    if not valor:
        return None
    if isinstance(valor, datetime):
        marco = valor
    else:
        marco = datetime.fromisoformat(str(valor).replace('Z', '+00:00'))
    if timezone.is_naive(marco):
        marco = timezone.make_aware(marco, timezone.get_current_timezone())
    return marco


def prazo_declaracao(usuario):
    """Retorna o prazo único: criação posterior ou marco para contas existentes."""
    marco = _marco_rollout()
    if marco is None:
        return None
    entrou_em = usuario.date_joined
    inicio = entrou_em if entrou_em >= marco else marco
    return inicio + timedelta(days=7)


def politica_esta_ativa():
    return bool(settings.AGE_POLICY_ACTIVE and _marco_rollout())


def _obter_usuario_negocio(usuario_auth):
    usuario, _ = Usuario.objects.get_or_create(
        user_auth=usuario_auth,
        defaults={'nome': usuario_auth.username},
    )
    return usuario


def obter_estado(usuario_auth, *, bloquear=False):
    consulta = EstadoEtarioConta.objects
    if bloquear:
        consulta = consulta.select_for_update()
    estado, criado = consulta.get_or_create(usuario=usuario_auth)
    if criado:
        EventoEtarioConta.objects.create(
            usuario=usuario_auth,
            chave_idempotencia=__import__('uuid').uuid4(),
            tipo=EventoEtarioConta.Tipo.CONTA_INICIALIZADA,
            estado_anterior=EstadoEtarioConta.Estado.PENDENTE,
            estado_novo=EstadoEtarioConta.Estado.PENDENTE,
            faixa_resultante=EventoEtarioConta.Faixa.DESCONHECIDA,
            versao_politica=settings.AGE_POLICY_VERSION,
            versao_documentos=settings.TERMS_VERSION,
        )
    return estado


def faixa_para_data(data_nascimento, *, hoje=None):
    hoje = hoje or timezone.localdate()
    if data_nascimento > hoje:
        raise ValidationError({'data_nascimento': ['A data de nascimento não pode estar no futuro.']})
    idade = hoje.year - data_nascimento.year - (
        (hoje.month, hoje.day) < (data_nascimento.month, data_nascimento.day)
    )
    if idade > 130:
        raise ValidationError({'data_nascimento': ['Confira o ano informado.']})
    return EventoEtarioConta.Faixa.ADULTO if idade >= 18 else EventoEtarioConta.Faixa.MENOR_18


def restricao_etaria_ativa(usuario_auth):
    # Flag e marco compõem um rollback operacional: enquanto a política não
    # está ativa, a autenticação não cria registros de elegibilidade por mero
    # acesso a uma rota. A criação continua ocorrendo ao consultar/declarar
    # explicitamente a política ou pela migration aditiva.
    if not politica_esta_ativa():
        return False, None

    estado = obter_estado(usuario_auth)
    if estado.estado in {
        EstadoEtarioConta.Estado.RESTRITO_MENOR,
        EstadoEtarioConta.Estado.EM_REVISAO,
    }:
        return True, estado
    prazo = prazo_declaracao(usuario_auth)
    pendente_vencido = (
        estado.estado == EstadoEtarioConta.Estado.PENDENTE
        and politica_esta_ativa()
        and prazo is not None
        and timezone.now() >= prazo
    )
    return pendente_vencido, estado


@transaction.atomic
def registrar_declaracao(*, usuario_auth, data_nascimento, chave_idempotencia, origem):
    """Registra declaração/correção e sua evidência na mesma transação."""
    usuario_auth = User.objects.select_for_update().get(pk=usuario_auth.pk)
    existente = EventoEtarioConta.objects.filter(
        usuario=usuario_auth,
        chave_idempotencia=chave_idempotencia,
    ).first()
    if existente:
        return existente, True

    estado = obter_estado(usuario_auth, bloquear=True)
    agora = timezone.now()
    if (
        estado.declaracoes_sucesso >= 2
        and estado.proxima_correcao_permitida_em
        and agora < estado.proxima_correcao_permitida_em
    ):
        raise ValidationError({
            'data_nascimento': ['Uma nova correção estará disponível após o prazo informado.'],
            'proxima_correcao_permitida_em': estado.proxima_correcao_permitida_em,
        })

    faixa = faixa_para_data(data_nascimento)
    anterior = estado.estado
    novo = (
        EstadoEtarioConta.Estado.LIBERADO_ADULTO
        if faixa == EventoEtarioConta.Faixa.ADULTO
        else EstadoEtarioConta.Estado.RESTRITO_MENOR
    )
    ordinal = estado.declaracoes_sucesso + 1
    proxima_correcao = agora + timedelta(days=7) if ordinal >= 2 else None

    usuario_negocio = _obter_usuario_negocio(usuario_auth)
    usuario_negocio.data_nascimento_eligibilidade = data_nascimento
    usuario_negocio.save(update_fields=['data_nascimento_eligibilidade'])

    estado.estado = novo
    estado.declaracoes_sucesso = ordinal
    estado.proxima_correcao_permitida_em = proxima_correcao
    estado.versao_politica = settings.AGE_POLICY_VERSION
    estado.save(update_fields=[
        'estado', 'declaracoes_sucesso', 'proxima_correcao_permitida_em',
        'versao_politica', 'atualizado_em',
    ])
    evento = EventoEtarioConta.objects.create(
        usuario=usuario_auth,
        chave_idempotencia=chave_idempotencia,
        tipo=(
            EventoEtarioConta.Tipo.DECLARACAO_REGISTRADA
            if ordinal == 1 else EventoEtarioConta.Tipo.CORRECAO_REGISTRADA
        ),
        estado_anterior=anterior,
        estado_novo=novo,
        faixa_resultante=faixa,
        ordinal_declaracao=ordinal,
        proxima_correcao_permitida_em=proxima_correcao,
        origem=origem,
        versao_politica=settings.AGE_POLICY_VERSION,
        versao_documentos=settings.TERMS_VERSION,
    )
    if novo == EstadoEtarioConta.Estado.RESTRITO_MENOR:
        ja_aberta = SolicitacaoSuporte.objects.filter(
            usuario=usuario_auth,
            categoria='idade',
            status__in=[
                SolicitacaoSuporte.Status.ABERTA,
                SolicitacaoSuporte.Status.EM_ANALISE,
            ],
        ).exists()
        if not ja_aberta:
            SolicitacaoSuporte.objects.create(
                usuario=usuario_auth,
                categoria='idade',
                assunto='Revisão de elegibilidade etária',
                mensagem=(
                    'Solicitação criada automaticamente após mudança para modo restrito. '
                    'Avalie o caso sem solicitar documento pelo canal comum.'
                ),
            )
    return evento, False


def resumo_estado(usuario_auth):
    estado = obter_estado(usuario_auth)
    restrita, _estado_restrito = restricao_etaria_ativa(usuario_auth)
    return {
        'estado': estado.estado,
        'declaracoes_sucesso': estado.declaracoes_sucesso,
        'prazo_declaracao_em': prazo_declaracao(usuario_auth),
        'proxima_correcao_permitida_em': estado.proxima_correcao_permitida_em,
        'restricao_ativa': restrita,
        'versao_politica': estado.versao_politica or settings.AGE_POLICY_VERSION,
    }
