from datetime import timedelta

from django.contrib.auth.models import User
from django.db import models, transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from usuarios.audit import registrar_acao
from usuarios.models import EventoGovernancaConta, SuspensaoConta, Usuario
from usuarios.permissions import eh_admin_parabook


PAPEIS_PRIVILEGIADOS = {'moderador', 'admin'}
PAPEIS_EDITAVEIS_DASHBOARD = {'leitor', 'autor'}


def dados_suspensao_ativa(user):
    if not user or not user.is_authenticated:
        return None
    suspensao = (
        SuspensaoConta.objects
        .filter(usuario=user, status=SuspensaoConta.Status.ATIVA, termina_em__gt=timezone.now())
        .order_by('-termina_em')
        .first()
    )
    if not suspensao:
        return None
    restante = max(0, int((suspensao.termina_em - timezone.now()).total_seconds()))
    return {
        'ativa': True,
        'protocolo': str(suspensao.protocolo),
        'termina_em': suspensao.termina_em,
        'segundos_restantes': restante,
        'duracao_dias': suspensao.duracao_dias,
    }


def _papel(user):
    perfil = getattr(user, 'perfil_customizado', None)
    if user.is_superuser:
        return 'admin'
    return getattr(perfil, 'tipo', 'leitor')


def _e_conta_privilegiada(user):
    return bool(user.is_superuser or user.is_staff or _papel(user) in PAPEIS_PRIVILEGIADOS)


def _validar_reautenticacao(ator, senha_atual):
    if not senha_atual or not ator.check_password(senha_atual):
        raise ValidationError({'senha_atual': ['Senha atual incorreta.']})


def _validar_alvo_governanca(ator, alvo):
    if not eh_admin_parabook(ator):
        raise PermissionDenied('Acesso restrito à moderação.')
    if ator.pk == alvo.pk:
        raise ValidationError({'detail': 'Não é permitido aplicar esta ação à própria conta.'})
    if _e_conta_privilegiada(alvo):
        raise PermissionDenied('Contas privilegiadas são gerenciadas somente pelo procedimento externo, fora do Dashboard.')


def _proteger_ultimo_administrador(alvo):
    if not _e_conta_privilegiada(alvo):
        return
    restantes = User.objects.filter(is_active=True).exclude(pk=alvo.pk).filter(
        # Superusuário ou staff com papel administrativo/moderador.
        models.Q(is_superuser=True)
        | models.Q(is_staff=True, perfil_customizado__tipo__in=PAPEIS_PRIVILEGIADOS)
    ).exists()
    if not restantes:
        raise ValidationError({'detail': 'O último administrador operacional não pode ser suspenso ou rebaixado.'})


@transaction.atomic
def aplicar_suspensao(*, ator, alvo_id, duracao_dias, categoria, justificativa, senha_atual):
    ator = User.objects.select_for_update().get(pk=ator.pk)
    alvo = User.objects.select_for_update().get(pk=alvo_id)
    _validar_alvo_governanca(ator, alvo)
    _validar_reautenticacao(ator, senha_atual)
    _proteger_ultimo_administrador(alvo)

    try:
        duracao_dias = int(duracao_dias)
    except (TypeError, ValueError):
        raise ValidationError({'duracao_dias': ['Use 3, 7, 15 ou 30 dias.']})
    if duracao_dias not in SuspensaoConta.DURACOES_PERMITIDAS:
        raise ValidationError({'duracao_dias': ['Use 3, 7, 15 ou 30 dias.']})
    categoria = str(categoria or '').strip()[:40]
    justificativa = str(justificativa or '').strip()[:2000]
    if not categoria:
        raise ValidationError({'categoria': ['Informe a categoria da suspensão.']})
    if len(justificativa) < 10:
        raise ValidationError({'justificativa': ['Informe uma justificativa com pelo menos 10 caracteres.']})

    agora = timezone.now()
    expiradas = SuspensaoConta.objects.select_for_update().filter(
        usuario=alvo,
        status=SuspensaoConta.Status.ATIVA,
        termina_em__lte=agora,
    )
    for anterior in expiradas:
        anterior.status = SuspensaoConta.Status.EXPIRADA
        anterior.save(update_fields=['status'])
        EventoGovernancaConta.objects.create(
            usuario=alvo,
            ator=ator,
            tipo=EventoGovernancaConta.Tipo.SUSPENSAO_EXPIRADA,
            motivo='Prazo encerrado antes de nova decisão administrativa.',
            metadados={'suspensao_id': anterior.pk},
        )

    if SuspensaoConta.objects.filter(usuario=alvo, status=SuspensaoConta.Status.ATIVA).exists():
        raise ValidationError({'detail': 'A conta já possui uma suspensão ativa.'})

    suspensao = SuspensaoConta.objects.create(
        usuario=alvo,
        aplicada_por=ator,
        duracao_dias=duracao_dias,
        categoria=categoria,
        justificativa=justificativa,
        inicia_em=agora,
        termina_em=agora + timedelta(days=duracao_dias),
    )
    EventoGovernancaConta.objects.create(
        usuario=alvo,
        ator=ator,
        tipo=EventoGovernancaConta.Tipo.SUSPENSAO_APLICADA,
        motivo=justificativa,
        protocolo=suspensao.protocolo,
        metadados={'duracao_dias': duracao_dias, 'categoria': categoria},
    )
    registrar_acao(
        ator=ator,
        acao='conta.suspensa',
        recurso='User',
        recurso_id=alvo.pk,
        metadados={'protocolo': str(suspensao.protocolo), 'duracao_dias': duracao_dias},
    )
    return suspensao


@transaction.atomic
def revogar_suspensao(*, ator, alvo_id, justificativa, senha_atual):
    ator = User.objects.select_for_update().get(pk=ator.pk)
    alvo = User.objects.select_for_update().get(pk=alvo_id)
    _validar_alvo_governanca(ator, alvo)
    _validar_reautenticacao(ator, senha_atual)
    justificativa = str(justificativa or '').strip()[:2000]
    if len(justificativa) < 10:
        raise ValidationError({'justificativa': ['Informe uma justificativa com pelo menos 10 caracteres.']})
    suspensao = SuspensaoConta.objects.select_for_update().filter(
        usuario=alvo,
        status=SuspensaoConta.Status.ATIVA,
        termina_em__gt=timezone.now(),
    ).first()
    if not suspensao:
        raise ValidationError({'detail': 'A conta não possui suspensão ativa.'})
    suspensao.status = SuspensaoConta.Status.REVOGADA
    suspensao.revogada_por = ator
    suspensao.revogada_em = timezone.now()
    suspensao.save(update_fields=['status', 'revogada_por', 'revogada_em'])
    EventoGovernancaConta.objects.create(
        usuario=alvo,
        ator=ator,
        tipo=EventoGovernancaConta.Tipo.SUSPENSAO_REVOGADA,
        motivo=justificativa,
        metadados={'suspensao_id': suspensao.pk, 'protocolo_original': str(suspensao.protocolo)},
    )
    registrar_acao(
        ator=ator,
        acao='conta.suspensao_revogada',
        recurso='User',
        recurso_id=alvo.pk,
        metadados={'protocolo': str(suspensao.protocolo)},
    )
    return suspensao


@transaction.atomic
def alterar_papel(*, ator, alvo_id, novo_papel, justificativa, senha_atual):
    ator = User.objects.select_for_update().get(pk=ator.pk)
    alvo = User.objects.select_for_update().get(pk=alvo_id)
    _validar_alvo_governanca(ator, alvo)
    _validar_reautenticacao(ator, senha_atual)
    novo_papel = str(novo_papel or '').strip()
    if novo_papel not in PAPEIS_EDITAVEIS_DASHBOARD:
        raise ValidationError({'novo_papel': ['O Dashboard permite somente leitor ou autor.']})
    usuario = getattr(alvo, 'perfil_customizado', None)
    if not usuario:
        raise ValidationError({'detail': 'A conta não possui perfil de negócio.'})
    anterior = usuario.tipo
    if anterior == novo_papel:
        raise ValidationError({'detail': 'A conta já possui esse papel.'})
    if anterior not in {'leitor', 'aguardando_aprovacao', 'autor'}:
        raise PermissionDenied('Papéis administrativos são gerenciados fora do Dashboard.')
    justificativa = str(justificativa or '').strip()[:2000]
    if len(justificativa) < 10:
        raise ValidationError({'justificativa': ['Informe uma justificativa com pelo menos 10 caracteres.']})
    usuario.tipo = novo_papel
    usuario.notificacao_autor = novo_papel == 'autor'
    usuario.save(update_fields=['tipo', 'notificacao_autor'])
    evento = EventoGovernancaConta.objects.create(
        usuario=alvo,
        ator=ator,
        tipo=EventoGovernancaConta.Tipo.PAPEL_ALTERADO,
        motivo=justificativa,
        metadados={'papel_anterior': anterior, 'papel_novo': novo_papel},
    )
    registrar_acao(
        ator=ator,
        acao='conta.papel_alterado',
        recurso='User',
        recurso_id=alvo.pk,
        metadados={'papel_anterior': anterior, 'papel_novo': novo_papel, 'protocolo': str(evento.protocolo)},
    )
    return usuario, evento
