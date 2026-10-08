"""Encerramento e descarte verificável. Não opera infraestrutura externa."""
from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken

from biblioteca.models import Livro, RecursoPublicacao, TentativaPublicacao
from comunidades.models import Comunidade, PostagemComunidade, RespostaPostagem
from perfis.models import Perfil
from usuarios.audit import registrar_acao
from usuarios.models import (
    AutenticacaoDoisFatores, DestinoDescarte, EncerramentoConta, EventoGovernancaConta, PreservacaoDados,
    SessaoDispositivo, Usuario,
)
from usuarios.privacidade_provas import iniciar_prazo_provas, registrar_prova
from usuarios.retencao import limite_retencao


def evento_descarte_obra(livro):
    evento = livro.retirado_em or livro.removido_definitivamente_em
    if evento is None:
        return None
    recursos = RecursoPublicacao.objects.filter(evento__livro=livro)
    if recursos.filter(status='pendente').exists() or recursos.filter(decidido_em__isnull=True).exists():
        return None
    from usuarios.models_moderacao import RecursoModeracao
    transversais = RecursoModeracao.objects.filter(caso__alvo_livro=livro)
    if transversais.filter(estado='pendente').exists() or transversais.filter(decidido_em__isnull=True).exists():
        return None
    datas = list(recursos.values_list('decidido_em', flat=True)) + list(transversais.values_list('decidido_em', flat=True))
    return max([evento, *datas])


def _preservacoes(recurso, ref, destino='banco'):
    return PreservacaoDados.objects.filter(destino=destino, recurso=recurso,
        recurso_ref=str(ref), liberada_em__isnull=True)


def _destino(encerramento, *, destino, classe, recurso, ref, objeto='', evento_em=None,
             estado='pendente', motivo=''):
    item, _ = DestinoDescarte.objects.get_or_create(
        encerramento=encerramento, destino=destino, recurso=recurso, recurso_ref=str(ref),
        defaults={'classe': classe, 'objeto': objeto, 'evento_em': evento_em,
                  'limite_em': limite_retencao(classe, evento_em), 'estado': estado, 'motivo_codigo': motivo},
    )
    return item


def _registrar_arquivos(encerramento, queryset, campos, classe='R02', evento_em=None):
    for registro in queryset:
        for campo in campos:
            arquivo = getattr(registro, campo)
            if arquivo:
                _destino(encerramento, destino='storage', classe=classe,
                    recurso=registro._meta.label, ref=f'{registro.pk}:{campo}', objeto=arquivo.name,
                    evento_em=evento_em, motivo='conferir_objeto_versoes_e_uso')


def _retirar_social(encerramento, queryset):
    for registro in queryset.select_for_update():
        recurso = registro._meta.label
        if _preservacoes(recurso, registro.pk).exists():
            # Conteúdo sob causa seletiva continua apenas na evidência cifrada.
            # Sem chave, manter a linha restrita e bloquear exposição nos clientes.
            conteudo = {'conteudo': registro.conteudo}
            if isinstance(registro, PostagemComunidade):
                conteudo['titulo'] = registro.titulo
            try:
                registrar_prova(usuario=encerramento.usuario, classe='R13', encerramento=encerramento,
                    conteudo={'recurso': recurso, 'referencia': str(registro.pk), **conteudo},
                    expira_em=encerramento.descarte_ate)
            except ValidationError:
                registro.retirada_privacidade = True
                registro.save(update_fields=['retirada_privacidade'])
                continue
        registro.autor = None
        registro.conteudo = ''
        registro.retirada_privacidade = True
        campos = ['autor', 'conteudo', 'retirada_privacidade']
        if isinstance(registro, PostagemComunidade):
            registro.titulo = 'Conteúdo removido'
            registro.imagem = None
            campos += ['titulo', 'imagem']
        registro.save(update_fields=campos)


def _revogar_acesso(usuario, agora):
    usuario.is_active = False
    usuario.set_unusable_password()
    usuario.save(update_fields=['is_active', 'password'])
    SessaoDispositivo.objects.filter(usuario=usuario, revogada_em__isnull=True).update(revogada_em=agora)
    for token in OutstandingToken.objects.filter(user=usuario, expires_at__gt=agora):
        BlacklistedToken.objects.get_or_create(token=token)
    OutstandingToken.objects.filter(user=usuario).update(token='')
    AutenticacaoDoisFatores.objects.filter(usuario=usuario).delete()


def _retirar_comunidades(encerramento):
    for comunidade in Comunidade.objects.select_for_update().filter(criador=encerramento.usuario):
        preservada = _preservacoes(comunidade._meta.label, comunidade.pk).exists()
        pode_limpar = True
        if preservada:
            try:
                registrar_prova(usuario=encerramento.usuario, classe='R13', encerramento=encerramento,
                    conteudo={'recurso': comunidade._meta.label, 'referencia': str(comunidade.pk),
                              'nome': comunidade.nome, 'descricao': comunidade.descricao},
                    expira_em=encerramento.descarte_ate)
            except ValidationError:
                pode_limpar = False
        comunidade.retirada_privacidade = True
        if pode_limpar:
            comunidade.criador = None
            comunidade.nome = 'Comunidade'
            comunidade.descricao = ''
        comunidade.save(update_fields=['retirada_privacidade', 'criador', 'nome', 'descricao'])


@transaction.atomic
def encerrar_conta(usuario):
    usuario = User.objects.select_for_update().get(pk=usuario.pk)
    custom = Usuario.objects.filter(user_auth=usuario).first()
    if usuario.is_superuser or usuario.is_staff or (custom and custom.tipo in {'moderador', 'admin'}):
        raise PermissionDenied('Contas administrativas exigem o procedimento de continuidade operacional.')
    existente = EncerramentoConta.objects.filter(usuario=usuario).first()
    if existente:
        return existente
    agora = timezone.now()
    encerramento = EncerramentoConta.objects.create(
        usuario=usuario, conta_id_original=usuario.pk, conta_criada_em=usuario.date_joined,
        encerrada_em=agora, descarte_ate=limite_retencao('R01', agora), prova_ate=limite_retencao('R08', agora),
    )
    _revogar_acesso(usuario, agora)
    _destino(encerramento, destino='banco', classe='R01', recurso='auth.User', ref=usuario.pk, evento_em=agora)

    perfis = Perfil.objects.filter(usuario=usuario)
    posts = PostagemComunidade.objects.filter(autor=usuario)
    respostas = RespostaPostagem.objects.filter(autor=usuario)
    obras = Livro.objects.filter(solicitacao_publicacao__usuario=usuario)
    _registrar_arquivos(encerramento, perfis, ('foto', 'capa'), evento_em=agora)
    _registrar_arquivos(encerramento, posts, ('imagem',), evento_em=agora)
    for caso in usuario.solicitacoes_suporte.all():
        _destino(encerramento, destino='banco', classe='R05', recurso=caso._meta.label, ref=caso.pk,
            evento_em=caso.encerrada_em, estado='pendente' if caso.encerrada_em else 'impedido',
            motivo='' if caso.encerrada_em else 'aguardar_encerramento_comprovado')
    for livro in obras.select_for_update():
        if not livro.retirado_em:
            livro.retirado_em = agora
        livro.status = 'retirado'
        livro.save(update_fields=['status', 'retirado_em'])
        evento = evento_descarte_obra(livro)
        _registrar_arquivos(encerramento, Livro.objects.filter(pk=livro.pk), ('pdf', 'pdf_amostra', 'capa'),
            classe='R12', evento_em=evento)
        _registrar_arquivos(encerramento, TentativaPublicacao.objects.filter(solicitacao__livro=livro),
            ('pdf', 'pdf_amostra', 'capa'), classe='R12', evento_em=evento)
    _retirar_social(encerramento, posts)
    _retirar_social(encerramento, respostas)
    _retirar_comunidades(encerramento)

    prova_impedida = False
    try:
        if custom and custom.data_nascimento:
            registrar_prova(usuario=usuario, classe='R10', encerramento=encerramento,
                conteudo={'data_declarada_legada': custom.data_nascimento, 'origem': 'legado_sem_reconstrucao'})
        if custom and custom.data_nascimento_eligibilidade and not usuario.provas_privacidade.filter(classe='R10').exists():
            registrar_prova(usuario=usuario, classe='R10', encerramento=encerramento,
                conteudo={'data_declarada': custom.data_nascimento_eligibilidade.isoformat(), 'origem': 'operacional_atual_sem_historico_reconstruido'})
        if custom and custom.termos_aceitos:
            registrar_prova(usuario=usuario, classe='R09', encerramento=encerramento,
                conteudo={'versao_termos': custom.versao_termos_aceita, 'aceito_em': custom.data_aceite_termos})
        iniciar_prazo_provas(encerramento)
    except ValidationError:
        prova_impedida = True
    _destino(encerramento, destino='provas', classe='R08', recurso='EncerramentoConta', ref=encerramento.protocolo,
        evento_em=agora, estado='impedido' if prova_impedida else 'concluido',
        motivo='chave_evidencia_ausente' if prova_impedida else 'prova_minima_segregada')
    for destino, classe in (('gmail', 'R07'), ('logs', 'R06'), ('copias', 'R01')):
        _destino(encerramento, destino=destino, classe=classe, recurso='EncerramentoConta', ref=encerramento.protocolo,
            estado='impedido', motivo='conferir_destino_e_evento')
    registrar_acao(ator=None, acao='conta.encerrada', recurso='User', recurso_id=usuario.pk,
        metadados={'protocolo': str(encerramento.protocolo)})
    return encerramento


@transaction.atomic
def reconciliar_contas_restauradas(encerramentos):
    """Aplicar somente no restore isolado, antes de liberar acesso.

    A origem do registro deve ser a cópia atual do controle de encerramentos,
    conservada fora do snapshot restaurado. Não prova expurgo de cópias externas.
    """
    resultado = {'revogadas': 0, 'ausentes': 0, 'conflitos': 0}
    for encerramento in encerramentos:
        usuario = User.objects.select_for_update().filter(pk=encerramento.conta_id_original).first()
        if usuario is None:
            resultado['ausentes'] += 1
        elif usuario.date_joined != encerramento.conta_criada_em:
            resultado['conflitos'] += 1
        else:
            _revogar_acesso(usuario, timezone.now())
            _retirar_social(encerramento, PostagemComunidade.objects.filter(autor=usuario))
            _retirar_social(encerramento, RespostaPostagem.objects.filter(autor=usuario))
            _retirar_comunidades(encerramento)
            Livro.objects.filter(solicitacao_publicacao__usuario=usuario).update(status='retirado')
            resultado['revogadas'] += 1
    return resultado
