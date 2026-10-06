"""Executor por item, com preview atualizado e confirmação do seu hash.

O comando público neste pacote só simula. As escritas abaixo são exercitadas
em testes sintéticos; a execução em origem real exige autorização específica.
"""
import hashlib
import json

from django.core.serializers.json import DjangoJSONEncoder
from django.apps import apps
from django.db import transaction
from django.db.models.deletion import Collector
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from biblioteca.models import DeclaracaoAutoria, EventoPublicacao, Livro, SolicitacaoPublicacao
from comunidades.models import PostagemComunidade, RespostaPostagem
from perfis.models import Perfil
from usuarios.models import DestinoDescarte, EncerramentoConta, EventoGovernancaConta, PreservacaoDados, SolicitacaoSuporte
from usuarios.privacidade_provas import registrar_prova
from usuarios.eventos import GOVERNANCA, filtrar_metadados
from usuarios.retencao import avaliar_destino, limite_retencao
from usuarios.privacidade_conta import evento_descarte_obra


def _preservacoes(item):
    return list(PreservacaoDados.objects.filter(destino=item.destino, recurso=item.recurso,
        recurso_ref=item.recurso_ref, liberada_em__isnull=True))


def _dependencias_conta(encerramento):
    usuario = encerramento.usuario
    if usuario is None:
        return {}
    coletor = Collector(using='default')
    coletor.collect([usuario])
    cascatas = {modelo._meta.label: sorted(obj.pk for obj in objetos) for modelo, objetos in coletor.data.items()}
    for queryset in coletor.fast_deletes:
        cascatas[queryset.model._meta.label] = list(queryset.order_by('pk').values_list('pk', flat=True))
    return {
        'cascatas': cascatas,
        'governanca': list(usuario.eventos_governanca.values_list('pk', 'protocolo')),
        'declaracoes': list(DeclaracaoAutoria.objects.filter(solicitacao__usuario=usuario).values_list('pk', 'solicitacao_id')),
        'perfis': list(Perfil.objects.filter(usuario=usuario).values_list('pk', 'foto', 'capa')),
        'suporte': list(usuario.solicitacoes_suporte.values_list('pk', 'status', 'encerrada_em')),
        'postagens': list(PostagemComunidade.objects.filter(autor=usuario).values_list('pk', 'atualizado_em')),
        'respostas': list(RespostaPostagem.objects.filter(autor=usuario).values_list('pk', 'atualizado_em')),
        'obras': list(Livro.objects.filter(solicitacao_publicacao__usuario=usuario).values_list('pk', 'status', 'retirado_em')),
    }


def preview_descarte(encerramento, *, agora=None):
    agora = agora or timezone.now()
    itens = []
    for item in encerramento.destinos.order_by('pk'):
        preservacoes = _preservacoes(item)
        condicoes = []
        if item.destino in {'gmail', 'logs', 'copias'}:
            condicoes.append(item.motivo_codigo == 'condicoes_conferidas')
        if item.classe == 'R05':
            caso = SolicitacaoSuporte.objects.filter(pk=item.recurso_ref).first()
            evento = caso.encerrada_em if caso else item.evento_em
        elif item.classe == 'R12':
            registro = apps.get_model(item.recurso).objects.filter(pk=item.recurso_ref.split(':')[0]).first()
            livro = registro if isinstance(registro, Livro) else registro.solicitacao.livro if registro else None
            evento = evento_descarte_obra(livro) if livro else item.evento_em
        else:
            evento = item.evento_em
        avaliacao = avaliar_destino(classe=item.classe, evento_em=evento, agora=agora,
            preservacoes=preservacoes, condicoes=condicoes)
        if item.destino == 'banco' and item.recurso == 'auth.User' and encerramento.usuario_id:
            usuario = encerramento.usuario
            if usuario.is_active or usuario.date_joined != encerramento.conta_criada_em:
                avaliacao.update(estado='impedido', motivo_codigo='conta_reativada_ou_divergente')
            elif encerramento.destinos.filter(destino='provas', estado='impedido').exists():
                avaliacao.update(estado='impedido', motivo_codigo='prova_nao_segregada')
            elif not preservacoes:
                # R01 é prazo máximo; a finalidade operacional já terminou.
                avaliacao.update(estado='elegivel', motivo_codigo='encerramento_confirmado')
        if item.estado == 'concluido':
            avaliacao.update(estado='concluido', motivo_codigo=item.motivo_codigo)
        itens.append({'item': str(item.protocolo), 'destino': item.destino, 'recurso': item.recurso,
            'referencia': item.recurso_ref, 'classe': item.classe, **avaliacao,
            'preservacoes': [str(p.protocolo) for p in preservacoes]})
    documento = {
        'protocolo': str(encerramento.protocolo), 'conta_criada_em': encerramento.conta_criada_em,
        'encerrada_em': encerramento.encerrada_em, 'itens': itens,
        'dependencias': _dependencias_conta(encerramento),
    }
    # Uma dependência que seria apagada sob causa ativa é impedimento técnico
    # específico. Os outros destinos continuam avaliados separadamente.
    for recurso, ids in documento['dependencias'].get('cascatas', {}).items():
        if PreservacaoDados.objects.filter(destino='banco', recurso=recurso,
                recurso_ref__in=[str(pk) for pk in ids], liberada_em__isnull=True).exists():
            for registro in itens:
                if registro['recurso'] == 'auth.User' and registro['estado'] != 'concluido':
                    registro.update(estado='impedido', motivo_codigo='dependencia_preservada')
    documento['confirmacao'] = hashlib.sha256(json.dumps(documento, cls=DjangoJSONEncoder, sort_keys=True).encode()).hexdigest()
    return documento


def _preservar_governanca(encerramento):
    usuario = encerramento.usuario
    for evento in usuario.eventos_governanca.all():
        preservada = PreservacaoDados.objects.filter(destino='banco', recurso=evento._meta.label,
            recurso_ref=str(evento.pk), liberada_em__isnull=True).exists()
        registrar_prova(usuario=usuario, classe='R09', evento_ref=evento.protocolo, encerramento=encerramento,
            conteudo={'tipo': evento.tipo, 'protocolo': str(evento.protocolo),
                'recurso': evento._meta.label, 'referencia': str(evento.pk),
                'metadados': filtrar_metadados(GOVERNANCA, evento.tipo, evento.metadados), 'criado_em': evento.criado_em},
            expira_em=limite_retencao('R09', evento.criado_em))
        if not preservada:
            EventoGovernancaConta.objects.filter(pk=evento.pk).delete()


def _preservar_autoria(encerramento):
    for obra in Livro.objects.filter(solicitacao_publicacao__usuario=encerramento.usuario):
        registrar_prova(usuario=encerramento.usuario, classe='R09', encerramento=encerramento,
            conteudo={'obra_ref': obra.pk, 'titulo': obra.titulo, 'autor': obra.autor, 'isbn': obra.isbn},
            expira_em=limite_retencao('R09', evento_descarte_obra(obra)))
        obra.titulo = 'Obra retirada'
        obra.autor = 'Autor indisponível'
        obra.isbn = None
        obra.save(update_fields=['titulo', 'autor', 'isbn'])
    for declaracao in DeclaracaoAutoria.objects.filter(solicitacao__usuario=encerramento.usuario):
        if PreservacaoDados.objects.filter(destino='banco', recurso=declaracao._meta.label,
            recurso_ref=str(declaracao.pk), liberada_em__isnull=True).exists():
            continue
        registrar_prova(usuario=encerramento.usuario, classe='R09', encerramento=encerramento,
            conteudo={'solicitacao_ref': declaracao.solicitacao_id, 'cpf_digest': declaracao.cpf_digest,
                'recurso': declaracao._meta.label, 'referencia': str(declaracao.pk),
                'cpf_final': declaracao.cpf_final, 'registro_autoral': declaracao.registro_autoral,
                'numero_registro': declaracao.numero_registro, 'versao_termos': declaracao.versao_termos,
                'declarado_em': declaracao.declarado_em, 'ip_origem': declaracao.ip_origem},
            expira_em=limite_retencao('R09', evento_descarte_obra(declaracao.solicitacao.livro)))
        DeclaracaoAutoria.objects.filter(pk=declaracao.pk).delete()


@transaction.atomic
def executar_descarte_banco(*, encerramento, item_protocolo, confirmacao, agora=None):
    encerramento = EncerramentoConta.objects.select_for_update().get(pk=encerramento.pk)
    if encerramento.usuario_id:
        encerramento.usuario.__class__.objects.select_for_update().get(pk=encerramento.usuario_id)
    preview = preview_descarte(encerramento, agora=agora)
    if preview['confirmacao'] != confirmacao:
        raise ValidationError('O preview mudou; confira dependências e confirme novamente.')
    item = DestinoDescarte.objects.select_for_update().get(encerramento=encerramento, protocolo=item_protocolo)
    avaliacao = next(registro for registro in preview['itens'] if registro['item'] == str(item_protocolo))
    if item.estado == 'concluido':
        return item
    if avaliacao['estado'] != 'elegivel' or item.destino != 'banco':
        raise ValidationError('Item não elegível para este executor de banco.')
    if item.recurso == 'auth.User':
        usuario = encerramento.usuario
        if usuario is not None:
            usuario.__class__.objects.select_for_update().get(pk=usuario.pk)
            _preservar_governanca(encerramento)
            _preservar_autoria(encerramento)
            # Solicitações/provas/suporte têm SET_NULL; não apagar a obra e a
            # estante de terceiros. Conteúdo social próprio já foi retirado.
            usuario.delete()
            encerramento.usuario = None
        encerramento.descartada_em = agora or timezone.now()
        encerramento.save(update_fields=['usuario', 'descartada_em'])
    elif item.recurso == 'usuarios.SolicitacaoSuporte':
        SolicitacaoSuporte.objects.filter(pk=item.recurso_ref).delete()
    else:
        raise ValidationError('Recurso não suportado pelo executor; registrar impedimento.')
    item.estado = 'concluido'
    item.motivo_codigo = 'descarte_banco_comprovado'
    item.concluido_em = agora or timezone.now()
    item.save(update_fields=['estado', 'motivo_codigo', 'concluido_em'])
    return item
