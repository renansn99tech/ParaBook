"""G3: transições autorizadas, protocolo privado e Conselho transacional.

O retorno é disponibilizado no protocolo; isso não afirma entrega por e-mail.
Remoção definitiva encerra o acesso, mantendo o descarte físico no rito G5.
"""
import hashlib
import json
from datetime import date, timedelta
from uuid import uuid4

from cryptography.fernet import InvalidToken
from django.conf import settings
from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from rest_framework.exceptions import APIException, PermissionDenied, ValidationError

from biblioteca.models import Denuncia, Livro, RecursoPublicacao, SolicitacaoPublicacao
from comunidades.models import Comunidade, DenunciaComunidade
from usuarios.eventos import AUDITORIA, filtrar_metadados
from usuarios.governanca import _papel, _validar_reautenticacao, aplicar_suspensao, revogar_suspensao
from usuarios.models import AuditoriaAcao, PreservacaoDados, SolicitacaoSuporte, SuspensaoConta
from usuarios.models_moderacao import (
    AprovacaoConselho, CalendarioModeracao, CasoModeracao, EventoModeracao,
    ImpedimentoModeracao, PedidoConselho, RecursoModeracao,
)
from usuarios.operacao_moderacao import CalendarioAtendimento, prazos_caso
from usuarios.permissions import eh_admin_parabook
from usuarios.privacidade_provas import _cifra
from usuarios.retencao import limite_retencao

CATEGORIAS = ('protecao_infantojuvenil', 'conteudo_ilegal', 'privacidade', 'direitos_autorais',
              'assedio_abuso', 'conta_comprometida', 'falha_seguranca', 'suporte')
ACOES = ('assumir', 'triagem', 'confirmar', 'complemento', 'decidir', 'comunicar', 'encerrar',
         'recurso_decidir', 'conselho_solicitar', 'conselho_aprovar', 'conselho_executar', 'conselho_cancelar')


class ConflitoModeracao(APIException):
    status_code = 409
    default_detail = 'O estado mudou. Atualize o protocolo antes de continuar.'


def cifrar(dados):
    if not dados:
        return ''
    return _cifra().encrypt(json.dumps(dados, ensure_ascii=False, sort_keys=True).encode()).decode('ascii')


def decifrar(registro):
    if not registro.dados_cifrados:
        return {}
    if registro.chave_id != settings.PRIVACY_EVIDENCE_KEY_ID:
        raise ValidationError('Versão da chave de atendimento exige conferência restrita.')
    try:
        return json.loads(_cifra().decrypt(registro.dados_cifrados.encode('ascii')))
    except (InvalidToken, ValueError, UnicodeError) as exc:
        raise ValidationError('Não foi possível consultar o atendimento cifrado.') from exc


def _digest(valor):
    return salted_hmac('g3-protocolo', valor, algorithm='sha256').hexdigest()


def _assinatura(dados):
    return _digest(json.dumps({k: v for k, v in dados.items() if k != 'senha_atual'},
                              sort_keys=True, default=str))


def exigir_operador(ator, prioridade='', sensivel=False):
    if not ator.is_active or not eh_admin_parabook(ator):
        raise PermissionDenied('Acesso restrito à operação de moderação.')
    if (prioridade in {'P0', 'P1'} or sensivel) and not eh_gestor_moderacao(ator):
        raise PermissionDenied('P0/P1, suspensão, recursos e Conselho exigem administrador.')


def conferir_rota_legada(origem, origem_id):
    """Uma decisão assumida na fila não pode ser sobrescrita por outro rito."""
    caso = CasoModeracao.objects.select_for_update().filter(origem=origem, origem_id=origem_id).first()
    if caso and (caso.responsavel_id or caso.triado_em or caso.prioridade in {'P0', 'P1'}):
        raise ConflitoModeracao('Caso vinculado à operação: conclua pelo protocolo na aba Operação e Conselho.')


def eh_gestor_moderacao(ator):
    # O papel operacional foi migrado de admin para moderador na Sessão 019.
    # Capacidade administrativa explícita preserva esses operadores sem exigir
    # superusuário ou dar P0/P1 a um novo moderador P2 por padrão.
    return bool(ator.is_active and eh_admin_parabook(ator) and
                (_papel(ator) == 'admin' or ator.has_perm('usuarios.operar_risco_grave')))


def _evento(caso, ator, acao, *, chave=None, dados=None):
    evento = EventoModeracao.objects.create(caso=caso, ator=ator, acao=acao, chave=chave or uuid4(),
        dados_cifrados=cifrar(dados or {}), chave_id=settings.PRIVACY_EVIDENCE_KEY_ID)
    AuditoriaAcao.objects.create(ator=ator, acao=f'moderacao.caso.{acao}', recurso='CasoModeracao',
        recurso_id=str(caso.pk), metadados=filtrar_metadados(AUDITORIA, f'moderacao.caso.{acao}',
        {'protocolo': str(caso.protocolo), 'prioridade': caso.prioridade, 'estado': caso.estado}))
    return evento


def _travar_caso(ator, protocolo, extras=()):
    inicial = get_object_or_404(CasoModeracao, protocolo=protocolo)
    ids = {ator.pk, inicial.alvo_usuario_id, *extras} - {None}
    usuarios = {u.pk: u for u in User.objects.select_for_update().filter(pk__in=ids).order_by('pk')}
    ator = usuarios[ator.pk]
    exigir_operador(ator)
    caso = CasoModeracao.objects.select_for_update().get(pk=inicial.pk)
    return ator, caso


@transaction.atomic
def receber_publica(dados):
    existente = CasoModeracao.objects.select_for_update().filter(chave_entrada=dados['chave_idempotencia']).first()
    digest = _digest(dados['segredo'])
    conteudo = {k: dados.get(k, '') for k in ('relato', 'referencia', 'contato', 'titularidade', 'evidencia', 'risco_imediato')}
    if existente:
        if not constant_time_compare(existente.acesso_digest, digest) or decifrar(existente) != conteudo or existente.categoria != dados['categoria']:
            raise ConflitoModeracao('Chave já usada em outro envio. Preserve a chave apenas para retentativa idêntica.')
        return existente
    categoria = dados['categoria']
    prioridade = 'P0' if dados.get('risco_imediato') or categoria == 'protecao_infantojuvenil' else (
        'P1' if categoria in {'conteudo_ilegal', 'conta_comprometida', 'falha_seguranca'} else 'P2')
    # Serializa duas retentativas concorrentes sem gerar dois protocolos.
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_advisory_xact_lock(%s)', [int(str(dados['chave_idempotencia']).replace('-', '')[:15], 16)])
    if CasoModeracao.objects.filter(chave_entrada=dados['chave_idempotencia']).exists():
        return receber_publica(dados)
    caso = CasoModeracao.objects.create(origem='publica', categoria=categoria, prioridade=prioridade,
        chave_entrada=dados['chave_idempotencia'], acesso_digest=digest,
        dados_cifrados=cifrar(conteudo), chave_id=settings.PRIVACY_EVIDENCE_KEY_ID)
    _evento(caso, None, 'recebido')
    return caso


def consultar_publica(protocolo, segredo):
    caso = CasoModeracao.objects.filter(protocolo=protocolo, origem='publica').first()
    if not caso or not constant_time_compare(caso.acesso_digest, _digest(segredo)):
        raise PermissionDenied('Protocolo ou código de acompanhamento inválido.')
    return caso


@transaction.atomic
def complementar_publica(dados):
    caso = consultar_publica(dados['protocolo'], dados['segredo'])
    caso = CasoModeracao.objects.select_for_update().get(pk=caso.pk)
    chave = dados['chave_idempotencia']
    anterior = EventoModeracao.objects.filter(chave=chave).first()
    if anterior:
        if anterior.caso_id != caso.pk or anterior.acao != 'complemento_recebido' or decifrar(anterior).get('assinatura') != _assinatura(dados):
            raise ConflitoModeracao()
        return caso
    if caso.estado != 'aguarda_complemento':
        raise ConflitoModeracao('Este protocolo não está aguardando complemento.')
    caso.estado = 'em_analise'
    caso.save()
    _evento(caso, None, 'complemento_recebido', chave=chave,
            dados={'relato': dados['relato'], 'assinatura': _assinatura(dados)})
    return caso


@transaction.atomic
def sincronizar_origens(ator):
    exigir_operador(ator)
    fontes = (
        ('obra', Denuncia.objects.filter(status='pendente', arquivada=False), 'data_denuncia'),
        ('comunidade', DenunciaComunidade.objects.filter(status='pendente'), 'data_denuncia'),
        ('suporte', SolicitacaoSuporte.objects.filter(status__in=['aberta', 'em_analise']), 'criada_em'),
        ('suspensao', SuspensaoConta.objects.all(), 'criada_em'),
    )
    criados = 0
    for origem, consulta, campo in fontes:
        for registro in consulta.order_by('pk').iterator():
            defaults = {'categoria': getattr(registro, 'categoria', 'suporte') or 'suporte',
                        'recebido_em': getattr(registro, campo), 'usuario_id': registro.usuario_id}
            if origem == 'obra':
                defaults.update(alvo_livro_id=registro.livro_id)
                defaults['alvo_usuario_id'] = SolicitacaoPublicacao.objects.filter(livro_id=registro.livro_id).values_list('usuario_id', flat=True).first()
            elif origem == 'comunidade':
                defaults.update(alvo_comunidade_id=registro.comunidade_id, alvo_usuario_id=registro.comunidade.criador_id)
            elif origem == 'suspensao':
                if CasoModeracao.objects.filter(suspensao=registro).exists():
                    continue
                defaults.update(alvo_usuario_id=registro.usuario_id, prioridade='P1', estado='decidido',
                    suspensao=registro,
                    medida='suspensao_conta', decidido_em=registro.criada_em,
                    responsavel_id=registro.aplicada_por_id, decisor_id=registro.aplicada_por_id,
                    triado_em=registro.criada_em, regra='Governança de conta',
                    resposta_publica=registro.justificativa, evidencia_ref=str(registro.protocolo))
            caso, novo = CasoModeracao.objects.get_or_create(origem=origem, origem_id=registro.pk, defaults=defaults)
            if novo:
                _evento(caso, ator, 'origem_vinculada')
                criados += 1
    return criados


def vincular_suspensao(suspensao, ator, caso=None):
    """A mesma decisão gera um só caso elegível, inclusive pelo endpoint herdado."""
    if caso is not None:
        caso.suspensao = suspensao
        return caso
    caso, novo = CasoModeracao.objects.get_or_create(suspensao=suspensao, defaults={
        'origem': 'suspensao', 'origem_id': suspensao.pk, 'categoria': suspensao.categoria,
        'usuario': suspensao.usuario, 'alvo_usuario': suspensao.usuario, 'prioridade': 'P1',
        'estado': 'decidido', 'medida': 'suspensao_conta', 'decidido_em': suspensao.criada_em,
        'responsavel': ator, 'decisor': ator, 'recebido_em': suspensao.criada_em,
        'regra': 'Governança de conta', 'evidencia_ref': str(suspensao.protocolo),
        'resposta_publica': suspensao.justificativa, 'retorno_estado': 'disponivel',
        'comunicado_em': timezone.now(),
    })
    if novo:
        _evento(caso, ator, 'origem_vinculada')
    return caso


@transaction.atomic
def preparar_conselho(ator, dados):
    ator = User.objects.select_for_update().get(pk=ator.pk)
    exigir_operador(ator, sensivel=True)
    _validar_reautenticacao(ator, dados['senha_atual'])
    anterior = CasoModeracao.objects.filter(chave_entrada=dados['chave_idempotencia']).first()
    if anterior:
        if anterior.origem != 'conselho' or anterior.responsavel_id != ator.pk or decifrar(anterior).get('assinatura') != _assinatura(dados):
            raise ConflitoModeracao()
        return anterior
    modelos = {'livro': Livro, 'comunidade': Comunidade, 'conta': User}
    alvo = get_object_or_404(modelos[dados['alvo_tipo']].objects.select_for_update(), pk=dados['alvo_id'])
    caso = CasoModeracao.objects.create(origem='conselho', categoria='suporte', prioridade='P1',
        responsavel=ator, triado_em=timezone.now(), estado='em_analise',
        chave_entrada=dados['chave_idempotencia'], dados_cifrados=cifrar({'motivo': dados['motivo'], 'assinatura': _assinatura(dados)}),
        chave_id=settings.PRIVACY_EVIDENCE_KEY_ID)
    if isinstance(alvo, Livro):
        caso.alvo_livro = alvo
        caso.alvo_usuario_id = SolicitacaoPublicacao.objects.filter(livro=alvo).values_list('usuario_id', flat=True).first()
    elif isinstance(alvo, Comunidade):
        caso.alvo_comunidade, caso.alvo_usuario_id = alvo, alvo.criador_id
    else:
        caso.alvo_usuario = alvo
    caso.save()
    _evento(caso, ator, 'origem_vinculada')
    return caso


@transaction.atomic
def conferir_calendario(ator, dados):
    exigir_operador(ator, sensivel=True)
    _validar_reautenticacao(ator, dados['senha_atual'])
    if dados['fim'] < dados['inicio'] or (dados['fim'] - dados['inicio']).days > 366:
        raise ValidationError('Calendário exige intervalo válido de até 366 dias.')
    if any(not dados['inicio'] <= dia <= dados['fim'] for dia in dados['feriados']):
        raise ValidationError('Feriado fora do intervalo conferido.')
    calendario = CalendarioModeracao.objects.create(inicio=dados['inicio'], fim=dados['fim'],
        feriados=[dia.isoformat() for dia in sorted(set(dados['feriados']))],
        referencia=dados['referencia'], conferido_por=ator)
    return calendario


def _configurar_alvo(caso, dados):
    tipo, ref = dados.get('alvo_tipo'), dados.get('alvo_id')
    if not tipo:
        return
    if caso.origem != 'publica' or any((caso.alvo_livro_id, caso.alvo_comunidade_id, caso.alvo_usuario_id)):
        raise ValidationError('O alvo de origem não pode ser substituído.')
    if tipo == 'livro':
        livro = get_object_or_404(Livro, pk=ref)
        caso.alvo_livro = livro
        caso.alvo_usuario_id = SolicitacaoPublicacao.objects.filter(livro=livro).values_list('usuario_id', flat=True).first()
    elif tipo == 'comunidade':
        comunidade = get_object_or_404(Comunidade, pk=ref)
        caso.alvo_comunidade = comunidade
        caso.alvo_usuario_id = comunidade.criador_id
    elif tipo == 'conta':
        caso.alvo_usuario = get_object_or_404(User, pk=ref)


def _triagem(caso, ator, dados):
    prioridade = dados['prioridade']
    exigir_operador(ator, prioridade)
    if caso.estado not in {'aguarda_triagem', 'em_analise'} or caso.decidido_em:
        raise ConflitoModeracao()
    if caso.responsavel_id not in (None, ator.pk):
        raise ConflitoModeracao('Caso já assumido por outro operador.')
    _configurar_alvo(caso, dados)
    caso.prioridade = prioridade
    caso.responsavel = ator
    caso.triado_em = timezone.now()
    caso.estado = 'em_analise'
    calendario_id = dados.get('calendario_id')
    if calendario_id:
        registro = get_object_or_404(CalendarioModeracao, pk=calendario_id)
        calendario = CalendarioAtendimento(registro.inicio, registro.fim,
            frozenset(date.fromisoformat(dia) for dia in registro.feriados), registro.referencia)
        try:
            prazos = prazos_caso(recebido_em=caso.recebido_em, prioridade=prioridade, calendario=calendario)
        except ValueError as exc:
            raise ValidationError(str(exc)) from exc
        caso.calendario = registro
        for campo, prazo in prazos.items():
            setattr(caso, campo, prazo)
    else:
        caso.calendario = None
        caso.confirmacao_humana_ate = caso.triagem_ate = caso.decisao_ate = None


def _aplicar_medida(caso, ator, dados):
    medida = dados['medida']
    if medida == 'suspensao_conta':
        exigir_operador(ator, sensivel=True)
        if not caso.alvo_usuario_id:
            raise ValidationError('Associe uma conta na triagem.')
        suspensao = aplicar_suspensao(ator=ator, alvo_id=caso.alvo_usuario_id,
            duracao_dias=dados['duracao_dias'], categoria='conduta', justificativa=dados['resposta'],
            senha_atual=dados['senha_atual'], caso_moderacao=caso)
        return str(suspensao.protocolo)
    if medida == 'restricao_conteudo':
        if caso.alvo_livro_id:
            from biblioteca import publicacao
            livro = Livro.objects.select_for_update().get(pk=caso.alvo_livro_id)
            if livro.removido_definitivamente_em or livro.status != 'publicado':
                raise ConflitoModeracao('A obra não admite nova contenção.')
            anterior = livro.status
            livro.status = 'suspenso'
            livro.save(update_fields=['status'])
            publicacao._registrar(ator, livro, 'suspensa', anterior, dados['resposta'])
        elif caso.alvo_comunidade_id:
            Comunidade.objects.filter(pk=caso.alvo_comunidade_id).update(em_manutencao=True)
        else:
            raise ValidationError('Associe conteúdo existente na triagem.')
    return ''


def _decidir(caso, ator, dados):
    if caso.estado != 'em_analise' or not caso.triado_em or caso.responsavel_id != ator.pk:
        raise ConflitoModeracao('Assuma e faça a triagem antes da decisão.')
    if caso.origem == 'suporte' and caso.categoria == 'idade':
        raise ValidationError('Revisão de idade deve ser decidida no fluxo específico do G2.')
    if caso.origem == 'recurso':
        raise ValidationError('Use a decisão específica de recurso.')
    exigir_operador(ator, caso.prioridade)
    if ator.pk in {caso.usuario_id, caso.alvo_usuario_id}:
        raise PermissionDenied('Operador não decide caso próprio ou contra a própria conta.')
    _validar_reautenticacao(ator, dados['senha_atual'])
    _aplicar_medida(caso, ator, dados)
    caso.regra, caso.evidencia_ref = dados['regra'], dados['evidencia_ref']
    caso.medida, caso.resposta_publica = dados['medida'], dados['resposta']
    caso.decisor, caso.decidido_em, caso.estado = ator, timezone.now(), 'decidido'
    caso.retorno_estado, caso.comunicado_em = 'pendente', None
    if caso.origem == 'suporte':
        SolicitacaoSuporte.objects.filter(pk=caso.origem_id).update(resposta=dados['resposta'],
            status='respondida', atendida_por=ator, atualizada_em=timezone.now())
    elif caso.origem == 'obra':
        Denuncia.objects.filter(pk=caso.origem_id).update(status='analisado', decisao=dados['resposta'],
            arquivada=True, data_arquivamento=timezone.now(), suspensao_cautelar=dados['medida'] == 'restricao_conteudo')
    elif caso.origem == 'comunidade':
        DenunciaComunidade.objects.filter(pk=caso.origem_id).update(
            status='acolhida' if dados['medida'] == 'restricao_conteudo' else 'arquivada', data_analise=timezone.now())


@transaction.atomic
def operar_caso(ator, protocolo, dados):
    extras = [dados.get('alvo_id') if dados.get('alvo_tipo') == 'conta' else None]
    if dados['acao'].startswith('conselho'):
        extras.extend(getattr(settings, 'MODERATION_COUNCIL_USER_IDS', ()))
    ator, caso = _travar_caso(ator, protocolo, extras=extras)
    acao, chave = dados['acao'], dados['chave_idempotencia']
    exigir_operador(ator, caso.prioridade, sensivel=acao.startswith('conselho') or acao == 'recurso_decidir')
    assinatura = _assinatura(dados)
    anterior = EventoModeracao.objects.filter(chave=chave).first()
    if anterior:
        if anterior.caso_id != caso.pk or anterior.ator_id != ator.pk or anterior.acao != acao or decifrar(anterior).get('assinatura') != assinatura:
            raise ConflitoModeracao('Retentativa não corresponde à operação original.')
        return caso
    if acao.startswith('conselho'):
        _operar_conselho(caso, ator, dados)
    elif acao == 'recurso_decidir':
        _decidir_recurso(caso, ator, dados)
    elif acao == 'assumir':
        if caso.estado in {'decidido', 'encerrado'} or caso.responsavel_id not in (None, ator.pk):
            raise ConflitoModeracao('Caso indisponível para assumir.')
        caso.responsavel = ator
    elif acao == 'triagem':
        _triagem(caso, ator, dados)
    elif acao == 'confirmar':
        if caso.responsavel_id != ator.pk or caso.confirmado_em or caso.estado == 'encerrado':
            raise ConflitoModeracao()
        caso.confirmado_em = timezone.now()
        caso.resposta_publica = dados['resposta']
        caso.retorno_estado = 'disponivel'
    elif acao == 'complemento':
        if caso.estado != 'em_analise' or caso.responsavel_id != ator.pk:
            raise ConflitoModeracao()
        caso.estado = 'aguarda_complemento'
        caso.resposta_publica, caso.retorno_estado = dados['resposta'], 'disponivel'
    elif acao == 'decidir':
        _decidir(caso, ator, dados)
    elif acao == 'comunicar':
        if not caso.decidido_em or caso.retorno_estado != 'pendente':
            raise ConflitoModeracao('Comunicação exige decisão e retorno pendente.')
        caso.comunicado_em = timezone.now()
        caso.retorno_estado = 'disponivel'
    elif acao == 'encerrar':
        if not caso.decidido_em or caso.retorno_estado == 'pendente' or caso.estado == 'encerrado':
            raise ConflitoModeracao('Conclusão exige decisão e resposta disponível.')
        if caso.pedidos_conselho.filter(estado='pendente').exists() or RecursoModeracao.objects.filter(caso=caso, estado='pendente').exists():
            raise ConflitoModeracao('Conselho ou recurso ainda em andamento.')
        caso.estado, caso.encerrado_em = 'encerrado', timezone.now()
        if caso.origem == 'suporte':
            SolicitacaoSuporte.objects.filter(pk=caso.origem_id).update(status='encerrada', encerrada_em=caso.encerrado_em)
    else:
        raise ValidationError('Ação inválida.')
    caso.save()
    _evento(caso, ator, acao, chave=chave, dados={'assinatura': assinatura,
        'motivo': dados.get('motivo', ''), 'resposta': dados.get('resposta', ''),
        'regra': dados.get('regra', ''), 'evidencia_ref': dados.get('evidencia_ref', '')})
    return caso


@transaction.atomic
def recorrer_caso(usuario, protocolo, dados):
    usuario = User.objects.select_for_update().get(pk=usuario.pk)
    caso = get_object_or_404(CasoModeracao.objects.select_for_update(), protocolo=protocolo,
                            alvo_usuario=usuario, medida__in=['suspensao_conta', 'remocao_definitiva'])
    if not caso.decidido_em or not usuario.is_active:
        raise PermissionDenied()
    anterior = RecursoModeracao.objects.filter(chave=dados['chave_idempotencia']).first()
    if anterior:
        if anterior.usuario_id != usuario.pk or anterior.caso_id != caso.pk or decifrar(anterior.atendimento).get('fundamento') != dados['fundamento']:
            raise ConflitoModeracao()
        return anterior.atendimento
    if RecursoModeracao.objects.filter(caso=caso).exists():
        raise ConflitoModeracao('Este evento já recebeu recurso.')
    atendimento = CasoModeracao.objects.create(origem='recurso', origem_id=caso.pk, categoria='suporte',
        usuario=usuario, alvo_usuario=usuario, alvo_livro=caso.alvo_livro, alvo_comunidade=caso.alvo_comunidade,
        prioridade='P2', dados_cifrados=cifrar({'fundamento': dados['fundamento']}), chave_id=settings.PRIVACY_EVIDENCE_KEY_ID)
    RecursoModeracao.objects.create(caso=caso, atendimento=atendimento, usuario=usuario,
                                    chave=dados['chave_idempotencia'])
    _evento(atendimento, usuario, 'recurso_recebido')
    return atendimento


def _decidir_recurso(caso, ator, dados):
    exigir_operador(ator, sensivel=True)
    _validar_reautenticacao(ator, dados['senha_atual'])
    recurso = get_object_or_404(RecursoModeracao.objects.select_for_update(), atendimento=caso, estado='pendente')
    if caso.estado != 'em_analise' or caso.responsavel_id != ator.pk or not caso.triado_em:
        raise ConflitoModeracao('Assuma e faça triagem do recurso.')
    if dados['acolher']:
        origem = recurso.caso
        if origem.medida == 'suspensao_conta':
            suspensao = SuspensaoConta.objects.select_for_update().filter(pk=origem.suspensao_id,
                usuario_id=origem.alvo_usuario_id, status='ativa', termina_em__gt=timezone.now()).first()
            if not suspensao:
                raise ConflitoModeracao('Suspensão do evento já encerrada; não revogue outra decisão posterior.')
            revogar_suspensao(ator=ator, alvo_id=origem.alvo_usuario_id, justificativa=dados['resposta'], senha_atual=dados['senha_atual'])
        else:
            raise ValidationError('Remoção definitiva exige pedido de restauração ao Conselho; conclua após a execução.')
    recurso.estado = 'acolhido' if dados['acolher'] else 'recusado'
    recurso.decidido_em = timezone.now()
    recurso.save()
    caso.medida = 'orientacao'
    caso.regra, caso.evidencia_ref = dados['regra'], dados['evidencia_ref']
    caso.decisor, caso.decidido_em, caso.estado = ator, timezone.now(), 'decidido'
    caso.resposta_publica = dados['resposta']
    caso.retorno_estado, caso.comunicado_em = 'pendente', None


def _alvo(caso):
    if caso.alvo_livro_id:
        return get_object_or_404(Livro.objects.select_for_update(), pk=caso.alvo_livro_id)
    if caso.alvo_comunidade_id:
        return get_object_or_404(Comunidade.objects.select_for_update(), pk=caso.alvo_comunidade_id)
    if caso.alvo_usuario_id:
        return get_object_or_404(User.objects.select_for_update(), pk=caso.alvo_usuario_id)
    raise ValidationError('Associe um alvo real na triagem antes do Conselho.')


def _snapshot(alvo, caso):
    campos = ('status', 'retirado_em', 'removido_definitivamente_em', 'em_manutencao',
              'removida_definitivamente_em', 'is_active', 'date_joined', 'password',
              'titulo', 'autor', 'categoria_id', 'origem', 'modelo_acesso', 'disponivel_de',
              'disponivel_ate', 'nome', 'criador_id')
    valor = {campo: str(getattr(alvo, campo)) for campo in campos if hasattr(alvo, campo)}
    for campo in ('pdf', 'pdf_amostra'):
        arquivo = getattr(alvo, campo, None)
        if not arquivo:
            continue
        # Mesmo caminho pode receber outros bytes no storage: nome não é prova.
        digest = hashlib.sha256()
        total = 0
        try:
            with arquivo.storage.open(arquivo.name, 'rb') as origem:
                while bloco := origem.read(65536):
                    total += len(bloco)
                    if total > settings.MAX_BOOK_UPLOAD_SIZE:
                        raise ConflitoModeracao('Arquivo excede o limite; confira o alvo antes do Conselho.')
                    digest.update(bloco)
        except (OSError, ValueError) as exc:
            raise ConflitoModeracao('Arquivo indisponível para conferir o Conselho.') from exc
        valor[campo] = {'nome': arquivo.name, 'sha256': digest.hexdigest(), 'bytes': total}
    valor.update(recurso=alvo._meta.label, id=alvo.pk, prioridade=caso.prioridade,
                 regra=caso.regra, decisao=caso.decidido_em.isoformat() if caso.decidido_em else '')
    return hashlib.sha256(json.dumps(valor, sort_keys=True).encode()).hexdigest()


def _travas(alvo, caso, acao):
    recurso, ref = alvo._meta.label, str(alvo.pk)
    if ImpedimentoModeracao.objects.filter(recurso=recurso, recurso_id=alvo.pk, liberada_em__isnull=True).exists():
        raise ConflitoModeracao('Há impedimento de retenção, incidente, autoridade ou preservação.')
    preservacoes = PreservacaoDados.objects.filter(liberada_em__isnull=True)
    filtro = Q(recurso=recurso) & (Q(recurso_ref=ref) | Q(recurso_ref__startswith=f'{ref}:'))
    filtro |= Q(recurso=caso._meta.label, recurso_ref=str(caso.pk))
    if isinstance(alvo, Livro):
        from biblioteca.models import DeclaracaoAutoria, EventoPublicacao, TentativaPublicacao
        for modelo, consulta in (
            (DeclaracaoAutoria, DeclaracaoAutoria.objects.filter(solicitacao__livro=alvo)),
            (TentativaPublicacao, TentativaPublicacao.objects.filter(solicitacao__livro=alvo)),
            (Denuncia, Denuncia.objects.filter(livro=alvo)),
            (EventoPublicacao, EventoPublicacao.objects.filter(livro=alvo)),
        ):
            ids = [str(pk) for pk in consulta.values_list('pk', flat=True)]
            refs = Q(recurso_ref__in=ids)
            for pk in ids:
                refs |= Q(recurso_ref__startswith=f'{pk}:')
            filtro |= Q(recurso=modelo._meta.label) & refs
    if preservacoes.filter(filtro).exists():
        raise ConflitoModeracao('Recurso sob preservação seletiva G5.')
    if RecursoModeracao.objects.filter(estado='pendente').filter(
        Q(caso__alvo_livro=alvo) if isinstance(alvo, Livro) else
        Q(caso__alvo_comunidade=alvo) if isinstance(alvo, Comunidade) else Q(caso__alvo_usuario=alvo)
    ).exclude(atendimento=caso if acao == 'restaurar' else None).exists():
        raise ConflitoModeracao('Recurso transversal pendente sobre o alvo.')
    if isinstance(alvo, Livro) and RecursoPublicacao.objects.filter(evento__livro=alvo, status='pendente').exists():
        raise ConflitoModeracao('Recurso de publicação pendente.')
    if isinstance(alvo, User):
        from usuarios.governanca import _validar_alvo_governanca
        _validar_alvo_governanca(caso.responsavel, alvo)
        if acao == 'restaurar':
            raise ValidationError('Conta encerrada não é restaurada; suspensão usa recurso próprio.')
    # O ato remove acesso. Retenção de material e descarte físico continuam G5.


def _membro(ator):
    exigir_operador(ator, sensivel=True)
    membros = set(getattr(settings, 'MODERATION_COUNCIL_USER_IDS', ()))
    if len(membros) != 2 or ator.pk not in membros:
        raise PermissionDenied('Identidade não vinculada ao Conselho pela configuração restrita.')


def _operar_conselho(caso, ator, dados):
    exigir_operador(ator, sensivel=True)
    _validar_reautenticacao(ator, dados['senha_atual'])
    acao = dados['acao']
    alvo = _alvo(caso)
    if ator.pk in {caso.usuario_id, caso.alvo_usuario_id}:
        raise PermissionDenied('Conselho não delibera sobre a própria conta ou conteúdo.')
    if acao == 'conselho_solicitar':
        if not caso.triado_em or caso.estado == 'encerrado':
            raise ConflitoModeracao('Conselho exige caso triado e aberto.')
        if PedidoConselho.objects.filter(recurso=alvo._meta.label, recurso_id=alvo.pk, estado='pendente').exists():
            raise ConflitoModeracao('Alvo já possui pedido pendente.')
        pedido = PedidoConselho.objects.create(caso=caso, chave=dados['chave_idempotencia'], solicitante=ator,
            acao=dados['conselho_acao'], recurso=alvo._meta.label, recurso_id=alvo.pk, snapshot=_snapshot(alvo, caso))
        return pedido
    pedido = get_object_or_404(PedidoConselho.objects.select_for_update(), protocolo=dados['pedido'], caso=caso)
    if pedido.estado != 'pendente':
        raise ConflitoModeracao('Pedido de Conselho já concluído ou cancelado.')
    if acao == 'conselho_cancelar':
        pedido.estado = 'cancelado'
        pedido.save(update_fields=['estado'])
        return
    _membro(ator)
    if pedido.recurso != alvo._meta.label or pedido.recurso_id != alvo.pk or pedido.snapshot != _snapshot(alvo, caso):
        raise ConflitoModeracao('Alvo ou decisão mudou. Cancele e prepare novo pedido.')
    _travas(alvo, caso, pedido.acao)
    if acao == 'conselho_aprovar':
        aprovacao = pedido.aprovacoes.filter(aprovador=ator).first()
        if aprovacao:
            raise ConflitoModeracao('Esta identidade já aprovou; não constitui segundo voto.')
        if pedido.aprovacoes.count() >= 2:
            raise ConflitoModeracao('Duas aprovações já registradas.')
        AprovacaoConselho.objects.create(pedido=pedido, aprovador=ator, snapshot=pedido.snapshot)
        return
    aprovacoes = list(pedido.aprovacoes.select_related('aprovador'))
    if len(aprovacoes) != 2 or len({a.aprovador_id for a in aprovacoes}) != 2:
        raise ConflitoModeracao('São necessárias duas aprovações distintas.')
    for voto in aprovacoes:
        if not voto.aprovador or voto.snapshot != pedido.snapshot or voto.criada_em < timezone.now() - timedelta(minutes=15):
            raise ConflitoModeracao('Aprovação ausente, alterada ou fora da janela de reautenticação de 15 minutos.')
        _membro(voto.aprovador)
    if pedido.acao == 'restaurar':
        if isinstance(alvo, Livro):
            from biblioteca import publicacao
            alvo.removido_definitivamente_em = None
            alvo.save(update_fields=['removido_definitivamente_em'])
            publicacao.restaurar_obra(ator, alvo.pk, dados['motivo'])
        elif isinstance(alvo, Comunidade):
            alvo.removida_definitivamente_em = None
            alvo.em_manutencao = False
            alvo.save(update_fields=['removida_definitivamente_em', 'em_manutencao'])
        else:
            raise ValidationError('Este alvo não admite restauração excepcional.')
        if caso.origem == 'recurso':
            recurso = RecursoModeracao.objects.get(atendimento=caso)
            recurso.estado, recurso.decidido_em = 'acolhido', timezone.now()
            recurso.save()
    elif isinstance(alvo, Livro):
        from biblioteca import publicacao
        anterior = alvo.status
        alvo.status = 'removido'
        alvo.data_remocao = alvo.removido_definitivamente_em = timezone.now()
        alvo.save(update_fields=['status', 'data_remocao', 'removido_definitivamente_em'])
        publicacao._registrar(ator, alvo, 'denuncia_acolhida', anterior, dados['motivo'])
    elif isinstance(alvo, Comunidade):
        alvo.em_manutencao = True
        alvo.removida_definitivamente_em = timezone.now()
        alvo.save(update_fields=['em_manutencao', 'removida_definitivamente_em'])
    else:
        from usuarios.privacidade_conta import encerrar_conta
        pedido.resultado_ref = str(encerrar_conta(alvo).protocolo)
    pedido.estado, pedido.executado_em = 'executado', timezone.now()
    pedido.save()
    caso.medida = 'remocao_definitiva' if pedido.acao == 'remover' else 'restauracao_conselho'
    caso.estado, caso.decisor, caso.decidido_em = 'decidido', ator, timezone.now()
    caso.regra = dados['regra']
    caso.evidencia_ref = dados['evidencia_ref']
    caso.resposta_publica = dados['resposta']
    caso.retorno_estado, caso.comunicado_em = 'pendente', None


def dados_publicos(caso):
    return {'protocolo': str(caso.protocolo), 'estado': caso.estado, 'recebido_em': caso.recebido_em,
        'confirmado_em': caso.confirmado_em, 'decidido_em': caso.decidido_em,
        'resposta': caso.resposta_publica if caso.retorno_estado != 'pendente' else '',
        'retorno_estado': caso.retorno_estado, 'encerrado_em': caso.encerrado_em,
        'pode_complementar': caso.estado == 'aguarda_complemento'}


def dados_operacionais(caso, ator):
    exigir_operador(ator, caso.prioridade)
    prazos = {}
    for etapa, prazo_campo, feito_campo in (('confirmacao', 'confirmacao_humana_ate', 'confirmado_em'),
                                           ('triagem', 'triagem_ate', 'triado_em'), ('decisao', 'decisao_ate', 'decidido_em')):
        prazo, feito = getattr(caso, prazo_campo), getattr(caso, feito_campo)
        prazos[etapa] = {'ate': prazo, 'feito_em': feito, 'estado': 'nao_calculado' if not prazo else
                         ('atrasado' if (feito or timezone.now()) > prazo else 'concluido' if feito else 'no_prazo')}
    relato = decifrar(caso)
    if caso.origem in {'obra', 'comunidade', 'suporte'}:
        modelos = {'obra': Denuncia, 'comunidade': DenunciaComunidade, 'suporte': SolicitacaoSuporte}
        origem = modelos[caso.origem].objects.filter(pk=caso.origem_id).first()
        if origem:
            relato = {'relato': getattr(origem, 'mensagem', getattr(origem, 'motivo', '')),
                      'evidencia': getattr(origem, 'evidencias', '')}
    return {**dados_publicos(caso), 'id': caso.pk, 'origem': caso.origem,
        'categoria': caso.categoria, 'prioridade': caso.prioridade,
        'responsavel': caso.responsavel_id, 'decisor': caso.decisor_id, 'prazos': prazos,
        'regra': caso.regra, 'evidencia_ref': caso.evidencia_ref, 'medida': caso.medida,
        'dados_atendimento': relato, 'alvo_livro': caso.alvo_livro_id,
        'alvo_comunidade': caso.alvo_comunidade_id, 'alvo_usuario': caso.alvo_usuario_id,
        'eventos': [{'acao': evento.acao, 'criado_em': evento.criado_em, 'ator': evento.ator_id,
                    'dados': {k: v for k, v in decifrar(evento).items() if k != 'assinatura'}}
                   for evento in caso.eventos.order_by('pk')[:100]],
        'conselho': [{'protocolo': p.protocolo, 'acao': p.acao, 'estado': p.estado,
                     'aprovacoes': list(p.aprovacoes.values('aprovador_id', 'criada_em'))} for p in caso.pedidos_conselho.order_by('pk')],
        'conselho_membros_configurados': len(set(getattr(settings, 'MODERATION_COUNCIL_USER_IDS', ()))),
        'operador_admin': eh_gestor_moderacao(ator),
        'operador_conselho': ator.pk in set(getattr(settings, 'MODERATION_COUNCIL_USER_IDS', ())) and eh_gestor_moderacao(ator),
    }


def preview_retencao_caso(caso, agora=None):
    agora = agora or timezone.now()
    bloqueado = (PreservacaoDados.objects.filter(recurso=caso._meta.label, recurso_ref=str(caso.pk), liberada_em__isnull=True).exists()
        or caso.pedidos_conselho.filter(estado='pendente').exists()
        or RecursoModeracao.objects.filter(Q(caso=caso) | Q(atendimento=caso), estado='pendente').exists())
    alvos = [(caso.alvo_usuario, caso.alvo_usuario_id), (caso.alvo_livro, caso.alvo_livro_id),
             (caso.alvo_comunidade, caso.alvo_comunidade_id)]
    for alvo, pk in alvos:
        if alvo:
            bloqueado |= ImpedimentoModeracao.objects.filter(recurso=alvo._meta.label,
                recurso_id=pk, liberada_em__isnull=True).exists()
            bloqueado |= PreservacaoDados.objects.filter(recurso=alvo._meta.label,
                liberada_em__isnull=True).filter(Q(recurso_ref=str(pk)) | Q(recurso_ref__startswith=f'{pk}:')).exists()
    evento = caso.encerrado_em
    classe_minima = 'R09' if caso.medida in {'suspensao_conta', 'remocao_definitiva'} else 'R08'
    if any(alvo and ImpedimentoModeracao.objects.filter(recurso=alvo._meta.label,
           recurso_id=pk, causa='incidente').exists() for alvo, pk in alvos):
        classe_minima = 'INCIDENTE'
    return {'protocolo': str(caso.protocolo), 'dados_atendimento_ate': limite_retencao('R05', evento),
        'registro_minimo_classe': classe_minima, 'registro_minimo_ate': limite_retencao(classe_minima, evento),
        'estado': 'preservado' if bloqueado else 'impedido' if not evento else
        'elegivel' if agora >= limite_retencao('R05', evento) else 'pendente'}


@transaction.atomic
def descartar_atendimento(caso, agora=None):
    """Executor restrito exercitado em testes; sem endpoint/CLI de escrita."""
    caso = CasoModeracao.objects.select_for_update().get(pk=caso.pk)
    preview = preview_retencao_caso(caso, agora)
    if preview['estado'] != 'elegivel':
        raise ValidationError('Atendimento fora da elegibilidade de descarte.')
    caso.dados_cifrados = caso.resposta_publica = caso.regra = caso.evidencia_ref = ''
    caso.acesso_digest = ''
    caso.save()
    # Conteúdo sensível pode ser descartado; metadados/eventos mínimos R08 permanecem.
    caso.eventos.update(dados_cifrados='')
    return preview
