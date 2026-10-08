"""Revisão assistida sem documentos, bypass de idade ou alteração de prazos."""
from uuid import uuid4

from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError, NotFound

from usuarios.audit import registrar_acao
from usuarios.governanca import _validar_alvo_governanca, _validar_reautenticacao
from usuarios.idade import obter_estado, faixa_para_data, _obter_usuario_negocio
from usuarios.models import EstadoEtarioConta, EventoEtarioConta, RevisaoEtaria, SolicitacaoSuporte
from usuarios.privacidade_provas import registrar_prova


def serializar_revisao(item):
    revisao = getattr(item, 'revisao_etaria', None)
    return {
        'id': item.pk, 'protocolo': str(item.protocolo), 'status': item.status,
        'resposta': item.resposta, 'criada_em': item.criada_em,
        'atualizada_em': item.atualizada_em, 'encerrada_em': item.encerrada_em,
        'decisao': revisao.decisao if revisao else '',
    }


def listar_revisoes(usuario):
    return [serializar_revisao(item) for item in SolicitacaoSuporte.objects.filter(
        usuario=usuario, categoria='idade',
    ).select_related('revisao_etaria')[:50]]


@transaction.atomic
def solicitar_revisao(*, usuario, mensagem, chave):
    usuario = User.objects.select_for_update().get(pk=usuario.pk)
    tentativa = EventoEtarioConta.objects.select_related('solicitacao').filter(chave_idempotencia=chave).first()
    if tentativa:
        if tentativa.usuario_id != usuario.pk or tentativa.tipo != EventoEtarioConta.Tipo.REVISAO_SOLICITADA:
            raise ValidationError({'chave_idempotencia': ['Use uma nova chave.']})
        if not tentativa.solicitacao:
            raise ValidationError('Protocolo fora da disponibilidade; solicite novo atendimento.')
        return tentativa.solicitacao
    anterior = RevisaoEtaria.objects.select_related('solicitacao').filter(chave_solicitacao=chave).first()
    if anterior:
        if anterior.solicitacao.usuario_id != usuario.pk:
            raise ValidationError({'chave_idempotencia': ['Use uma nova chave.']})
        return anterior.solicitacao
    if not usuario.is_active:
        raise PermissionDenied('Conta sem acesso ao atendimento autenticado.')
    item = SolicitacaoSuporte.objects.filter(
        usuario=usuario, categoria='idade', status__in=['aberta', 'em_analise'],
    ).order_by('pk').first()
    ja_vinculado = item and hasattr(item, 'revisao_etaria')
    if item is None:
        item = SolicitacaoSuporte.objects.create(
            usuario=usuario, categoria='idade', assunto='Revisão de elegibilidade etária',
            mensagem=mensagem,
        )
    elif not ja_vinculado:
        item.mensagem = mensagem
        item.save(update_fields=['mensagem', 'atualizada_em'])
    if not ja_vinculado:
        RevisaoEtaria.objects.create(solicitacao=item, chave_solicitacao=chave)
    estado = obter_estado(usuario, bloquear=True)
    EventoEtarioConta.objects.create(
        usuario=usuario, solicitacao=item, chave_idempotencia=chave,
        tipo=EventoEtarioConta.Tipo.REVISAO_SOLICITADA,
        estado_anterior=estado.estado, estado_novo=estado.estado,
        faixa_resultante=EventoEtarioConta.Faixa.DESCONHECIDA,
        ordinal_declaracao=estado.declaracoes_sucesso,
        proxima_correcao_permitida_em=estado.proxima_correcao_permitida_em,
        origem='suporte', versao_politica=settings.AGE_POLICY_VERSION,
        versao_documentos=settings.TERMS_VERSION,
    )
    registrar_acao(ator=usuario, acao='suporte.solicitacao_criada', recurso='SolicitacaoSuporte',
                   recurso_id=item.pk, metadados={'protocolo': str(item.protocolo), 'categoria': 'idade'})
    return item


@transaction.atomic
def decidir_revisao(*, ator, item_id, acao, resposta, senha_atual, chave):
    # A mesma ordem de locks de declaração/aniversário impede perda de estado.
    alvo_id = SolicitacaoSuporte.objects.filter(pk=item_id, categoria='idade').values_list('usuario_id', flat=True).first()
    if alvo_id is None:
        raise NotFound('Solicitação etária não disponível.')
    alvo = User.objects.select_for_update().get(pk=alvo_id)
    _validar_alvo_governanca(ator, alvo)
    _validar_reautenticacao(ator, senha_atual)
    if not alvo.is_active:
        raise ValidationError('Conta encerrada; seguir o procedimento de privacidade.')
    item = SolicitacaoSuporte.objects.select_for_update().get(pk=item_id)
    if item.usuario_id != alvo.pk:
        raise ValidationError('O protocolo mudou; consulte novamente.')
    tipo = EventoEtarioConta.Tipo.REVISAO_INICIADA if acao == 'iniciar' else EventoEtarioConta.Tipo.REVISAO_CONCLUIDA
    anterior = EventoEtarioConta.objects.filter(chave_idempotencia=chave).first()
    if anterior:
        if anterior.usuario_id != alvo.pk or anterior.solicitacao_id != item.pk or anterior.tipo != tipo:
            raise ValidationError({'chave_idempotencia': ['Use uma nova chave para esta ação.']})
        return item
    if item.status in {'respondida', 'encerrada'}:
        raise ValidationError('Revisão já encerrada; use um novo protocolo para novo atendimento.')
    estado = obter_estado(alvo, bloquear=True)
    revisao, _ = RevisaoEtaria.objects.get_or_create(
        solicitacao=item, defaults={'chave_solicitacao': uuid4()},
    )
    faixa = EventoEtarioConta.Faixa.DESCONHECIDA
    data = _obter_usuario_negocio(alvo).data_nascimento_eligibilidade
    if data:
        faixa = faixa_para_data(data)
    estado_anterior = estado.estado
    if acao == 'iniciar':
        if RevisaoEtaria.objects.filter(
            solicitacao__usuario=alvo, solicitacao__status='em_analise',
        ).exclude(solicitacao=item).exists():
            raise ValidationError('Já existe outro protocolo etário em análise para esta conta.')
        if item.status != 'aberta' and estado.estado == EstadoEtarioConta.Estado.EM_REVISAO:
            raise ValidationError('A revisão já está em análise.')
        estado.estado = EstadoEtarioConta.Estado.EM_REVISAO
        item.status = SolicitacaoSuporte.Status.EM_ANALISE
    else:
        if item.status != 'em_analise' or estado.estado != EstadoEtarioConta.Estado.EM_REVISAO:
            raise ValidationError('Inicie a análise antes da decisão.')
        if acao == 'confirmar_declaracao' and not data:
            raise ValidationError('Ainda não há declaração. Oriente o preenchimento pelo titular.')
        estado.estado = (
            EstadoEtarioConta.Estado.PENDENTE if not data else
            EstadoEtarioConta.Estado.LIBERADO_ADULTO if faixa == EventoEtarioConta.Faixa.ADULTO else
            EstadoEtarioConta.Estado.RESTRITO_MENOR
        )
        revisao.decisao = acao
        revisao.save(update_fields=['decisao'])
        item.status = SolicitacaoSuporte.Status.ENCERRADA
        item.encerrada_em = timezone.now()
    evento = EventoEtarioConta.objects.create(
        usuario=alvo, solicitacao=item, chave_idempotencia=chave, tipo=tipo,
        estado_anterior=estado_anterior, estado_novo=estado.estado,
        faixa_resultante=faixa, ordinal_declaracao=estado.declaracoes_sucesso,
        proxima_correcao_permitida_em=estado.proxima_correcao_permitida_em,
        origem='admin', versao_politica=settings.AGE_POLICY_VERSION,
        versao_documentos=settings.TERMS_VERSION,
    )
    # Orientação e resultado ficam cifrados; a identificação do operador está
    # na auditoria restrita, sem acrescentar dados de terceiro à exportação R10.
    registrar_prova(usuario=alvo, classe='R10', evento_ref=evento.protocolo,
                    conteudo={'evento_ref': str(evento.protocolo), 'protocolo': str(item.protocolo),
                              'acao': acao, 'resposta': resposta,
                              'faixa': faixa, 'estado': estado.estado})
    estado.save(update_fields=['estado', 'atualizado_em'])
    item.resposta = resposta
    item.atendida_por = ator
    item.save(update_fields=['status', 'resposta', 'atendida_por', 'encerrada_em', 'atualizada_em'])
    auditoria = registrar_acao(
        ator=ator, acao='idade.revisao_decidida', recurso='SolicitacaoSuporte', recurso_id=item.pk,
        metadados={'protocolo': str(item.protocolo), 'acao': acao, 'estado': estado.estado},
    )
    if auditoria is None:
        raise ValidationError('Não foi possível preservar a auditoria; a decisão não foi aplicada.')
    return item
