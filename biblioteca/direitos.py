"""Licenças conferidas, vinculadas à edição e ao conteúdo, com falha fechada."""
import hashlib
import base64
from io import BytesIO
import re
from datetime import timedelta
from uuid import UUID

from cryptography.exceptions import InvalidSignature
from django.conf import settings
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import LicencaObra, Livro, TentativaPublicacao
from .publicacao import ConflitoPublicacao, _registrar
from .quarentena import ler_conteudo
from .recibos_direitos import canonicalizar, verificar_recibo
from usuarios.permissions import eh_admin_parabook


def digest_arquivo(arquivo):
    return hashlib.sha256(ler_conteudo(arquivo)).hexdigest() if arquivo else ''


def digest_edicao(livro, tentativa=None):
    from .publicacao import _snapshot
    dados = _snapshot(livro)
    if tentativa:
        dados.update(tentativa.dados)
    dados['pdf_chave'] = (tentativa.pdf if tentativa else livro.pdf).name or ''
    dados['amostra_chave'] = (tentativa.pdf_amostra if tentativa else livro.pdf_amostra).name or ''
    dados['titulo'] = ' '.join(dados['titulo'].split())
    return hashlib.sha256(canonicalizar(dados)).hexdigest()


def exigir_conferente(user):
    if not (eh_admin_parabook(user) and user.is_active and user.has_perm('biblioteca.conferir_direitos')):
        raise PermissionDenied('Conferência de direitos exige permissão específica.')


def estado_direitos(livro, *, tentativa=None, agora=None, conferir_conteudo=False):
    agora = agora or timezone.now()
    registros = livro.licencas.order_by('-id')
    if not settings.BOOK_RIGHTS_REQUIRED and not registros.exists():
        return 'legado'
    licenca = registros.filter(edicao_sha256=digest_edicao(livro, tentativa)).first()
    if not licenca:
        return 'pendente'
    if licenca.estado != 'conferida':
        return licenca.estado
    try:
        chave = settings.BOOK_VAULT_PUBLIC_KEYS.get(licenca.chave_id, '')
        digest_chave = hashlib.sha256(base64.b64decode(chave, validate=True)).hexdigest()
        if not chave or licenca.chave_publica_sha256 != digest_chave:
            return 'custodia_indisponivel'
    except (ValueError, TypeError):
        return 'custodia_indisponivel'
    origem = tentativa.dados.get('origem', livro.origem) if tentativa else livro.origem
    modelo = tentativa.dados.get('modelo_acesso', livro.modelo_acesso) if tentativa else livro.modelo_acesso
    if licenca.origem != origem or modelo not in licenca.modelos_acesso:
        return 'escopo_incompativel'
    if settings.BOOK_DISTRIBUTION_TERRITORY not in licenca.territorios and '*' not in licenca.territorios:
        return 'territorio_nao_coberto'
    if agora < licenca.vigente_de:
        return 'ainda_indisponivel'
    if licenca.vigente_ate and agora >= licenca.vigente_ate:
        return 'expirada'
    if conferir_conteudo:
        try:
            pdf = tentativa.pdf if tentativa else livro.pdf
            amostra = tentativa.pdf_amostra if tentativa else livro.pdf_amostra
            if digest_arquivo(pdf) != licenca.pdf_sha256 or digest_arquivo(amostra) != licenca.amostra_sha256:
                return 'arquivo_alterado'
        except (OSError, ValueError):
            return 'arquivo_indisponivel'
    return 'conferida'


def exigir_direitos(livro, *, tentativa=None):
    if estado_direitos(livro, tentativa=tentativa, conferir_conteudo=True) not in {'conferida', 'legado'}:
        raise PermissionDenied('Direitos da edição pendentes, indisponíveis ou fora de vigência.')


def abrir_arquivo_licenciado(livro, *, amostra=False, tentativa=None):
    """Confere direitos sobre os mesmos bytes que serão entregues ao cliente."""
    from .quarentena import abrir_pdf_verificado
    arquivo = tentativa.pdf if tentativa else (livro.pdf_amostra if amostra else livro.pdf)
    if not settings.BOOK_RIGHTS_REQUIRED and not livro.licencas.exists():
        return abrir_pdf_verificado(arquivo)
    if estado_direitos(livro, tentativa=tentativa) != 'conferida':
        raise PermissionDenied('Direitos da edição indisponíveis.')
    licenca = livro.licencas.filter(edicao_sha256=digest_edicao(livro, tentativa)).order_by('-id').first()
    with abrir_pdf_verificado(arquivo) as stream:
        conteudo = stream.read(settings.MAX_BOOK_UPLOAD_SIZE + 1)
    digest = hashlib.sha256(conteudo).hexdigest()
    esperado = licenca.amostra_sha256 if amostra else licenca.pdf_sha256
    if len(conteudo) > settings.MAX_BOOK_UPLOAD_SIZE or digest != esperado:
        raise PermissionDenied('Arquivo incompatível com a edição conferida.')
    return BytesIO(conteudo)


def _data(valor):
    if not isinstance(valor, str):
        raise ValueError('Data inválida.')
    data = parse_datetime(valor)
    if not data or timezone.is_naive(data):
        raise ValueError('Data sem fuso horário.')
    return data


@transaction.atomic
def conferir_direitos(user, livro_id, recibo, *, tentativa_id=None):
    exigir_conferente(user)
    livro = get_object_or_404(Livro.objects.select_for_update(), pk=livro_id)
    if livro.removido_definitivamente_em or livro.demonstrativo:
        raise ConflitoPublicacao('Esta obra não admite conferência de direitos.')
    tentativa = None
    if tentativa_id is not None:
        tentativa = get_object_or_404(TentativaPublicacao, solicitacao__livro=livro, pk=tentativa_id, status='pendente')
    try:
        chave_id = recibo['dados']['chave_id']
        chave = settings.BOOK_VAULT_PUBLIC_KEYS.get(chave_id)
        if not chave:
            raise ValueError('Custodiante não configurado.')
        dados = verificar_recibo(recibo, chave)
        campos = {'schema', 'chave_id', 'referencia', 'livro_id', 'edicao_sha256', 'pdf_sha256',
                  'amostra_sha256', 'origem', 'versao', 'territorios', 'modelos_acesso',
                  'vigente_de', 'vigente_ate', 'emitido_em'}
        if set(dados) != campos or dados['schema'] != 'parabook-direitos-v1':
            raise ValueError('Formato não permitido.')
        agora = timezone.now()
        emitido = _data(dados['emitido_em'])
        if emitido > agora + timedelta(minutes=5) or emitido < agora - timedelta(hours=24):
            raise ValueError('Recibo fora da janela de conferência.')
        inicio = _data(dados['vigente_de'])
        fim = _data(dados['vigente_ate']) if dados['vigente_ate'] else None
        if fim and (fim <= inicio or fim <= agora):
            raise ValueError('Vigência encerrada ou inválida.')
        referencia = UUID(dados['referencia'])
        if type(dados['livro_id']) is not int or dados['livro_id'] != livro.pk:
            raise ValueError('Outra obra.')
        origem = tentativa.dados.get('origem', livro.origem) if tentativa else livro.origem
        modelo = tentativa.dados.get('modelo_acesso', livro.modelo_acesso) if tentativa else livro.modelo_acesso
        if dados['origem'] != origem or dados['edicao_sha256'] != digest_edicao(livro, tentativa):
            raise ValueError('Outra edição.')
        for campo in ('pdf_sha256', 'amostra_sha256'):
            if not isinstance(dados[campo], str) or (dados[campo] and not re.fullmatch('[a-f0-9]{64}', dados[campo])):
                raise ValueError('Hash inválido.')
        if dados['pdf_sha256'] != digest_arquivo(tentativa.pdf if tentativa else livro.pdf):
            raise ValueError('Outro PDF.')
        if dados['amostra_sha256'] != digest_arquivo(tentativa.pdf_amostra if tentativa else livro.pdf_amostra):
            raise ValueError('Outra amostra.')
        for campo, permitidos in (('modelos_acesso', {'gratuito', 'assinante', 'amostra'}),
                                 ('territorios', None)):
            valores = dados[campo]
            if type(valores) is not list or not 1 <= len(valores) <= 32 or len(set(valores)) != len(valores):
                raise ValueError('Escopo inválido.')
            if any(not isinstance(v, str) or (v not in permitidos if permitidos else not re.fullmatch('[A-Z]{2}|\\*', v)) for v in valores):
                raise ValueError('Escopo inválido.')
        if modelo not in dados['modelos_acesso']:
            raise ValueError('Modalidade não licenciada.')
        if not isinstance(dados['versao'], str) or not re.fullmatch('[A-Za-z0-9._-]{1,30}', dados['versao']):
            raise ValueError('Versão inválida.')
    except (KeyError, TypeError, ValueError, InvalidSignature, AttributeError, OSError) as exc:
        raise ValidationError({'recibo': 'Recibo inválido, vencido ou incompatível com a edição atual.'}) from exc
    digest = hashlib.sha256(canonicalizar(recibo)).hexdigest()
    existente = LicencaObra.objects.filter(referencia_cofre=referencia).first()
    if existente:
        if existente.recibo_sha256 != digest or existente.livro_id != livro.pk:
            raise ConflitoPublicacao('Referência de custódia já vinculada a outra conferência.')
        return existente  # Não reativa licença revogada nem reinicia vigência.
    licenca = LicencaObra.objects.create(
        livro=livro, origem=origem, edicao_sha256=dados['edicao_sha256'],
        pdf_sha256=dados['pdf_sha256'], amostra_sha256=dados['amostra_sha256'],
        referencia_cofre=referencia, recibo_sha256=digest, chave_id=chave_id,
        chave_publica_sha256=hashlib.sha256(base64.b64decode(chave, validate=True)).hexdigest(),
        versao=dados['versao'], territorios=dados['territorios'], modelos_acesso=dados['modelos_acesso'],
        vigente_de=inicio, vigente_ate=fim, conferida_por=user,
    )
    _registrar(user, livro, 'direitos_conferidos', livro.status)
    return licenca


@transaction.atomic
def restringir_direitos(user, livro_id, protocolo, estado):
    exigir_conferente(user)
    if estado not in {'revogada', 'disputa'}:
        raise ValidationError('Estado inválido.')
    livro = get_object_or_404(Livro.objects.select_for_update(), pk=livro_id)
    licenca = get_object_or_404(LicencaObra, livro=livro, protocolo=protocolo)
    if licenca.estado == estado:
        return licenca
    if licenca.estado == 'revogada':
        raise ConflitoPublicacao('Licença revogada exige nova conferência, sem apagar a anterior.')
    anterior = livro.status
    licenca.estado = estado
    licenca.save(update_fields=['estado', 'alterada_em'])
    if licenca.edicao_sha256 == digest_edicao(livro) and livro.status == 'publicado':
        livro.status = 'manutencao'
        livro.save(update_fields=['status'])
    _registrar(user, livro, f'direitos_{estado}', anterior)
    return licenca
