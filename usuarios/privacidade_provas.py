"""Provas R09/R10/R13 cifradas com chave dedicada, sem fallback à SECRET_KEY."""
import json
from uuid import uuid4

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.core.serializers.json import DjangoJSONEncoder
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError

from usuarios.audit import registrar_acao
from usuarios.models import ProvaPrivacidade, PreservacaoDados
from usuarios.permissions import eh_admin_parabook
from usuarios.retencao import limite_retencao


def _cifra():
    try:
        return Fernet(settings.PRIVACY_EVIDENCE_KEY.encode('ascii'))
    except (ValueError, AttributeError, UnicodeError) as exc:
        raise ValidationError({'detail': 'A chave dedicada de evidências de privacidade precisa ser configurada.'}) from exc


def registrar_prova(*, usuario, classe, conteudo, evento_ref=None, encerramento=None, expira_em=None):
    cifra = _cifra()
    prova, _ = ProvaPrivacidade.objects.get_or_create(
        evento_ref=evento_ref or uuid4(),
        defaults={
            'usuario': usuario, 'classe': classe, 'encerramento': encerramento,
            'chave_id': settings.PRIVACY_EVIDENCE_KEY_ID,
            'recurso': conteudo.get('recurso', ''), 'recurso_ref': conteudo.get('referencia', ''),
            'conteudo_cifrado': cifra.encrypt(json.dumps(conteudo, cls=DjangoJSONEncoder).encode('utf-8')).decode('ascii'),
            'expira_em': expira_em,
        },
    )
    return prova


def ler_prova(*, prova, ator, senha_atual=None, motivo_codigo=None):
    titular = prova.usuario_id == ator.pk and ator.is_active
    administrador = (
        eh_admin_parabook(ator) and ator.is_active
        and senha_atual and ator.check_password(senha_atual)
        and motivo_codigo in {'direito_titular', 'incidente', 'preservacao', 'revisao'}
    )
    if not titular and not administrador:
        raise PermissionDenied('Consulta de evidência não autorizada.')
    if prova.expira_em and timezone.now() >= prova.expira_em:
        raise PermissionDenied('Evidência fora do prazo de acesso; conferir descarte/preservação.')
    if prova.chave_id != settings.PRIVACY_EVIDENCE_KEY_ID:
        raise ValidationError('A versão da chave precisa de tratamento restrito.')
    try:
        conteudo = json.loads(_cifra().decrypt(prova.conteudo_cifrado.encode('ascii')))
    except (InvalidToken, ValueError, UnicodeError) as exc:
        raise ValidationError('Não foi possível ler a evidência cifrada.') from exc
    registrar_acao(ator=ator, acao='lgpd.prova_consultada', recurso='ProvaPrivacidade', recurso_id=prova.pk,
                   metadados={'protocolo': str(prova.protocolo)})
    return conteudo


def iniciar_prazo_provas(encerramento):
    for classe in ('R09', 'R10'):
        ProvaPrivacidade.objects.filter(usuario=encerramento.usuario, classe=classe, expira_em__isnull=True).update(
            encerramento=encerramento,
            expira_em=limite_retencao(classe, encerramento.encerrada_em),
        )


def preview_prova(prova, *, agora=None):
    """Avaliação sem descriptografar: causa ativa não reinicia o prazo original."""
    agora = agora or timezone.now()
    causas = PreservacaoDados.objects.filter(liberada_em__isnull=True).filter(
        Q(destino='provas', recurso=prova._meta.label, recurso_ref=str(prova.pk))
        | Q(destino='banco', recurso=prova.recurso, recurso_ref=prova.recurso_ref)
    )
    if causas.exists():
        estado = 'preservado'
    elif prova.expira_em is None:
        estado = 'impedido'
    else:
        estado = 'elegivel' if agora >= prova.expira_em else 'pendente'
    return {'protocolo': str(prova.protocolo), 'classe': prova.classe,
            'estado': estado, 'limite_em': prova.expira_em,
            'preservacoes': list(causas.order_by('pk').values_list('protocolo', flat=True))}


@transaction.atomic
def executar_descarte_prova(*, prova, agora=None):
    """Operação restrita, sem API/CLI de escrita; runtime SQL não tem DELETE.

    Testada apenas na origem sintética. Origem real exige autorização específica
    e conferência atual da causa, do recurso e da cópia por destino.
    """
    atual = ProvaPrivacidade.objects.select_for_update().filter(pk=prova.pk).first()
    if atual is None:
        return {'estado': 'concluido', 'protocolo': str(prova.protocolo)}
    resultado = preview_prova(atual, agora=agora)
    if resultado['estado'] != 'elegivel':
        raise ValidationError('Prova fora da elegibilidade; conferir prazo ou preservação.')
    atual.delete()
    return {'estado': 'concluido', 'protocolo': str(prova.protocolo)}
