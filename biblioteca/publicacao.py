"""Publicação/moderação: permissões, bloqueios e efeitos em uma transação."""
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.core.exceptions import ValidationError as ModelValidationError
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import salted_hmac
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from notificacoes.models import Notificacao
from usuarios.models import AuditoriaAcao
from usuarios.permissions import eh_admin_parabook
from .models import (
    BloqueioPublicacao, DeclaracaoAutoria, Denuncia, EventoPublicacao, Livro,
    RecursoPublicacao, SolicitacaoPublicacao, TentativaPublicacao,
)


class ConflitoPublicacao(APIException):
    status_code = 409
    default_detail = 'A situação mudou ou a operação já foi processada. Atualize a página.'


def exigir_autor(user):
    perfil = getattr(user, 'perfil_customizado', None)
    if not user.is_authenticated or not user.is_active or not perfil or perfil.tipo != 'autor' or user.is_staff or user.is_superuser:
        raise PermissionDenied('Somente autores aprovados enviam obras. Administradores usam o acervo do Dashboard.')


def exigir_admin(user):
    if not eh_admin_parabook(user):
        raise PermissionDenied('Acesso restrito à administração da plataforma.')


def exigir_motivo(motivo):
    motivo = str(motivo or '').strip()
    if not motivo or len(motivo) > 2000:
        raise ValidationError({'motivo': 'Informe uma justificativa de até 2000 caracteres.'})
    return motivo


def _livro_bloqueado(livro_id):
    return get_object_or_404(Livro.objects.select_for_update(), pk=livro_id)


def _propria_obra(user, livro):
    exigir_autor(user)
    return get_object_or_404(SolicitacaoPublicacao, livro=livro, usuario=user, livro__origem='autor_independente')


def _registrar(user, livro, acao, anterior, motivo='', denuncia=None):
    evento = EventoPublicacao.objects.create(
        livro=livro, ator=user, acao=acao, anterior=anterior, posterior=livro.status,
        motivo=motivo, denuncia=denuncia,
    )
    # Não usar o helper best-effort: falha de auditoria deve reverter a transição.
    AuditoriaAcao.objects.create(
        ator=user, acao=f'publicacao.{acao}', recurso='Livro', recurso_id=str(livro.pk),
        metadados={'evento_id': evento.pk, 'anterior': anterior, 'posterior': livro.status},
    )
    solicitacao = SolicitacaoPublicacao.objects.filter(livro=livro).first()
    destinatarios = {solicitacao.usuario_id} if solicitacao else set()
    if denuncia and denuncia.usuario_id:
        destinatarios.add(denuncia.usuario_id)
    for usuario_id in destinatarios:
        Notificacao.objects.create(
            usuario_id=usuario_id, titulo='Publicação analisada' if acao in {'aprovada', 'rejeitada'} else 'Atualização de publicação',
            mensagem=f'{livro.titulo}: {acao.replace("_", " ")}. Protocolo {evento.protocolo}.' + (f' {motivo}' if acao == 'rejeitada' else ''),
            tipo='SISTEMA', link='/minhas-publicacoes' if solicitacao and usuario_id == solicitacao.usuario_id else '/notificacoes',
        )
    return evento


def _snapshot(livro):
    return {campo: getattr(livro, campo) for campo in (
        'titulo', 'categoria_id', 'paginas', 'ano_publicacao', 'isbn', 'edicao',
    )}


def _tentativa_atual(solicitacao):
    tentativa = solicitacao.tentativas.first()
    if tentativa is None:
        tentativa = TentativaPublicacao.objects.create(
            solicitacao=solicitacao, status=solicitacao.status, dados=_snapshot(solicitacao.livro),
            pdf=solicitacao.livro.pdf.name or '', capa=solicitacao.livro.capa.name or '',
            analisada_em=solicitacao.data_analise, motivo=solicitacao.observacao_admin or '',
        )
    return tentativa


@transaction.atomic
def enviar_obra(user, dados, ip=None):
    exigir_autor(user)
    # A mesma ordem (conta -> obra) é usada na retirada e evita corrida com o envio.
    User.objects.select_for_update(no_key=True).get(pk=user.pk)
    bloqueio = BloqueioPublicacao.objects.filter(usuario=user, novas_obras_apos__gt=timezone.now()).first()
    if bloqueio:
        raise ConflitoPublicacao({'detail': 'Aguarde 24 horas após a retirada para enviar uma obra nova.',
                                  'novas_obras_apos': bloqueio.novas_obras_apos.isoformat()})
    dados = dict(dados)
    cpf = dados.pop('cpf_autor')
    registro = dados.pop('registro_autoral', '')
    numero = dados.pop('numero_registro', '')
    dados.pop('declaracao_autoria')
    dados.pop('aceitou_termos')
    livro = Livro.objects.create(**dados, autor=user.get_full_name() or user.username,
                                 origem='autor_independente', status='pendente')
    solicitacao = SolicitacaoPublicacao.objects.create(usuario=user, livro=livro)
    DeclaracaoAutoria.objects.create(
        solicitacao=solicitacao, cpf_digest=salted_hmac('parabook.declaracao.cpf', cpf).hexdigest(),
        cpf_final=cpf[-4:], registro_autoral=registro, numero_registro=numero,
        versao_termos=settings.TERMS_VERSION, ip_origem=ip,
    )
    _tentativa_atual(solicitacao)
    _registrar(user, livro, 'enviada', '')
    return livro


@transaction.atomic
def retirar_obra(user, livro_id):
    exigir_autor(user)
    User.objects.select_for_update(no_key=True).get(pk=user.pk)
    livro = _livro_bloqueado(livro_id)
    _propria_obra(user, livro)
    if livro.retirado_em:
        return livro  # repetição não reinicia a espera nem duplica efeitos
    anterior = livro.status
    livro.retirado_em = timezone.now()
    livro.status = 'retirado'
    livro.save(update_fields=['status', 'retirado_em'])
    BloqueioPublicacao.objects.update_or_create(usuario=user, defaults={
        'novas_obras_apos': livro.retirado_em + timedelta(hours=24),
    })
    _registrar(user, livro, 'retirada', anterior)
    return livro


@transaction.atomic
def enviar_revisao(user, livro_id, dados, reenviar=False):
    livro = _livro_bloqueado(livro_id)
    solicitacao = _propria_obra(user, livro)
    atual = _tentativa_atual(solicitacao)
    if atual.status == 'pendente':
        raise ConflitoPublicacao('Já existe uma versão aguardando análise.')
    if reenviar and (livro.status not in {'rejeitado', 'retirado'} or _restricoes(livro).exists()):
        raise ConflitoPublicacao('Reenvio permitido apenas após rejeição ou retirada, sem restrição de moderação.')
    anterior = livro.status
    proposta = _snapshot(livro)
    proposta.update({('categoria_id' if k == 'categoria' else k): (v.pk if k == 'categoria' else v)
                     for k, v in dados.items() if k not in {'pdf', 'capa'}})
    # Classificação conservadora: somente espaços redundantes no título são correção simples.
    simples = (not reenviar and livro.status == 'publicado' and set(dados) == {'titulo'}
               and ' '.join(dados['titulo'].split()) == ' '.join(livro.titulo.split()))
    tentativa = TentativaPublicacao.objects.create(
        solicitacao=solicitacao, dados=proposta,
        pdf=dados.get('pdf', livro.pdf.name or ''), capa=dados.get('capa', livro.capa.name or ''),
        status='aprovado' if simples else 'pendente', analisada_em=timezone.now() if simples else None,
    )
    if simples:
        livro.titulo = dados['titulo']
        livro.save(update_fields=['titulo'])
    if reenviar:
        livro.status = 'pendente'
        livro.retirado_em = None
        livro.save(update_fields=['status', 'retirado_em'])
    if not simples:
        solicitacao.status = 'pendente'
        solicitacao.save(update_fields=['status'])
    _registrar(user, livro, 'correcao_simples' if simples else 'revisao_enviada', anterior)
    return tentativa


@transaction.atomic
def analisar_publicacao(user, solicitacao_id, acao, motivo='', tentativa_id=None):
    exigir_admin(user)
    solicitacao = get_object_or_404(SolicitacaoPublicacao, pk=solicitacao_id)
    livro = _livro_bloqueado(solicitacao.livro_id)
    solicitacao.refresh_from_db()
    tentativa = _tentativa_atual(solicitacao)
    if tentativa_id is not None and str(tentativa.pk) != str(tentativa_id):
        raise ConflitoPublicacao('Uma nova versão foi enviada. Confira a versão atual antes de decidir.')
    if tentativa.status != 'pendente' or acao not in {'aprovar', 'recusar'}:
        raise ConflitoPublicacao()
    if acao == 'recusar':
        motivo = exigir_motivo(motivo)
    anterior = livro.status
    tentativa.status = 'aprovado' if acao == 'aprovar' else 'rejeitado'
    tentativa.motivo = motivo
    tentativa.analisada_em = timezone.now()
    tentativa.save(update_fields=['status', 'motivo', 'analisada_em'])
    solicitacao.status = tentativa.status
    solicitacao.observacao_admin = motivo
    solicitacao.data_analise = tentativa.analisada_em
    solicitacao.save(update_fields=['status', 'observacao_admin', 'data_analise'])
    if acao == 'aprovar':
        for campo, valor in tentativa.dados.items():
            setattr(livro, campo, valor)
        livro.pdf = tentativa.pdf.name
        livro.capa = tentativa.capa.name
        if livro.status in {'pendente', 'rejeitado'} and not livro.retirado_em and not _restricoes(livro).exists():
            livro.status = 'publicado'
    elif livro.status == 'pendente':
        livro.status = 'rejeitado'
    livro.save()
    _registrar(user, livro, 'aprovada' if acao == 'aprovar' else 'rejeitada', anterior, motivo)
    return livro


def _restricoes(livro):
    return livro.denuncias.filter(Q(suspensao_cautelar=True) | Q(status='removido'))


def _validar_restauracao(livro):
    if livro.retirado_em or _restricoes(livro).exists():
        raise ConflitoPublicacao('A obra tem retirada voluntária ou outra restrição vigente.')
    agora = timezone.now()
    if ((livro.disponivel_de and livro.disponivel_de > agora)
            or (livro.disponivel_ate and livro.disponivel_ate <= agora)):
        raise ConflitoPublicacao('A vigência da obra não permite restauração.')
    from .validators import validar_pdf_livro
    arquivo = livro.pdf_amostra if livro.modelo_acesso == 'amostra' else livro.pdf
    if not arquivo:
        raise ConflitoPublicacao('A obra não possui o arquivo necessário para restauração.')
    try:
        with arquivo.open('rb') as conteudo:
            validar_pdf_livro(conteudo)
    except (OSError, ValueError, ModelValidationError) as exc:
        raise ConflitoPublicacao('Não foi possível verificar o arquivo para restauração.') from exc


@transaction.atomic
def denunciar(user, livro_id, motivo, evidencias, referencia_externa=''):
    if referencia_externa:
        exigir_admin(user)
    elif not user.is_authenticated:
        raise PermissionDenied()
    livro = _livro_bloqueado(livro_id)
    if livro.status != 'publicado':
        raise ConflitoPublicacao('A obra não está publicada.')
    motivo = exigir_motivo(motivo)
    if len(motivo) > 150 or not str(evidencias).strip() or len(evidencias) > 4000:
        raise ValidationError('Informe motivo (até 150 caracteres) e evidências (até 4000 caracteres).')
    denuncia = Denuncia.objects.create(
        livro=livro, usuario=None if referencia_externa else user, motivo=motivo,
        evidencias=evidencias, referencia_externa=referencia_externa,
    )
    _registrar(user, livro, 'denuncia_recebida', livro.status, denuncia=denuncia)
    return denuncia


@transaction.atomic
def moderar_denuncia(user, denuncia_id, acao, motivo):
    exigir_admin(user)
    motivo = exigir_motivo(motivo)
    denuncia = get_object_or_404(Denuncia, pk=denuncia_id)
    livro = _livro_bloqueado(denuncia.livro_id)
    denuncia.refresh_from_db()
    anterior = livro.status
    if acao == 'reabrir':
        if not denuncia.arquivada or denuncia.status == 'pendente':
            raise ConflitoPublicacao()
        # Reabrir não restaura uma obra removida nem apaga a decisão anterior da trilha.
        denuncia.suspensao_cautelar = denuncia.status == 'removido'
        denuncia.status = 'pendente'
        denuncia.arquivada = False
        denuncia.data_arquivamento = None
    elif acao == 'suspender':
        if denuncia.status != 'pendente' or denuncia.suspensao_cautelar:
            raise ConflitoPublicacao()
        denuncia.suspensao_cautelar = True
        if not livro.retirado_em:
            livro.status = 'suspenso'
    elif acao in {'aprovar', 'recusar'}:
        if denuncia.status != 'pendente':
            raise ConflitoPublicacao()
        denuncia.status = 'removido' if acao == 'aprovar' else 'analisado'
        denuncia.suspensao_cautelar = False
        denuncia.arquivada = True
        denuncia.data_arquivamento = timezone.now()
        if acao == 'aprovar' and not livro.retirado_em:
            livro.status = 'removido'
            livro.data_remocao = timezone.now()
    else:
        raise ValidationError('Ação de denúncia inválida.')
    denuncia.decisao = motivo
    denuncia.save()
    livro.save(update_fields=['status', 'data_remocao'])
    _registrar(user, livro, {'aprovar': 'denuncia_acolhida', 'recusar': 'denuncia_arquivada',
                             'suspender': 'suspensa', 'reabrir': 'denuncia_reaberta'}[acao], anterior, motivo, denuncia)
    return denuncia


@transaction.atomic
def restaurar_obra(user, livro_id, motivo):
    exigir_admin(user)
    motivo = exigir_motivo(motivo)
    livro = _livro_bloqueado(livro_id)
    if livro.status not in {'removido', 'suspenso'}:
        raise ConflitoPublicacao()
    _validar_restauracao(livro)
    anterior = livro.status
    livro.status = 'publicado'
    livro.data_remocao = None
    livro.save(update_fields=['status', 'data_remocao'])
    _registrar(user, livro, 'restaurada', anterior, motivo)
    return livro


@transaction.atomic
def recorrer(user, evento_id, fundamento):
    evento = get_object_or_404(EventoPublicacao, pk=evento_id)
    livro = _livro_bloqueado(evento.livro_id)
    _propria_obra(user, livro)
    if evento.acao not in {'rejeitada', 'suspensa', 'denuncia_acolhida'} or hasattr(evento, 'recurso'):
        raise ConflitoPublicacao('Este evento não admite outro recurso.')
    recurso = RecursoPublicacao.objects.create(evento=evento, autor=user, fundamento=exigir_motivo(fundamento))
    _registrar(user, livro, 'recurso_recebido', livro.status)
    return recurso


@transaction.atomic
def analisar_recurso(user, recurso_id, acolher, motivo):
    exigir_admin(user)
    motivo = exigir_motivo(motivo)
    recurso = get_object_or_404(RecursoPublicacao, pk=recurso_id)
    livro = _livro_bloqueado(recurso.evento.livro_id)
    recurso.refresh_from_db()
    if recurso.status != 'pendente':
        raise ConflitoPublicacao()
    anterior = livro.status
    if acolher:
        evento = recurso.evento
        if evento.denuncia_id:
            # Uma decisão posterior sobre a mesma denúncia exige seu próprio recurso.
            if EventoPublicacao.objects.filter(denuncia_id=evento.denuncia_id, id__gt=evento.id).exists():
                raise ConflitoPublicacao('A denúncia recebeu uma decisão posterior. Revise o evento vigente.')
            Denuncia.objects.filter(pk=evento.denuncia_id).update(
                status='analisado', arquivada=True, data_arquivamento=timezone.now(), suspensao_cautelar=False,
            )
            if not livro.retirado_em and not _restricoes(livro).exists():
                _validar_restauracao(livro)
                livro.status = 'publicado'
                livro.data_remocao = None
                livro.save(update_fields=['status', 'data_remocao'])
        # Recurso de rejeição habilita nova análise, nunca publica um arquivo por si só.
        elif evento.acao == 'rejeitada':
            if EventoPublicacao.objects.filter(
                livro=livro, id__gt=evento.pk,
                acao__in=['revisao_enviada', 'aprovada', 'rejeitada', 'correcao_simples'],
            ).exists():
                raise ConflitoPublicacao('A publicação recebeu uma versão ou decisão posterior.')
            solicitacao = livro.solicitacao_publicacao
            atual = _tentativa_atual(solicitacao)
            TentativaPublicacao.objects.create(solicitacao=solicitacao, dados=atual.dados, pdf=atual.pdf.name, capa=atual.capa.name)
            solicitacao.status = 'pendente'
            solicitacao.save(update_fields=['status'])
            if livro.status == 'rejeitado':
                livro.status = 'pendente'
                livro.save(update_fields=['status'])
    recurso.status = 'acolhido' if acolher else 'recusado'
    recurso.decisao = motivo
    recurso.decidido_em = timezone.now()
    recurso.save(update_fields=['status', 'decisao', 'decidido_em'])
    _registrar(user, livro, 'recurso_acolhido' if acolher else 'recurso_recusado', anterior, motivo)
    return recurso
