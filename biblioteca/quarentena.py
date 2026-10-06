"""Varredura G4: motor local explícito, resultado por conteúdo e falha fechada.

Validação estrutural do PDF continua sendo uma etapa independente. Adaptadores
sintéticos são injetados somente pelos testes; nenhum endpoint declara limpo.
"""
from dataclasses import dataclass
import hashlib
from io import BytesIO
import os
import subprocess
import tempfile
from uuid import uuid4

from django.conf import settings
from django.db import transaction
from rest_framework.exceptions import PermissionDenied

from .models import VerificacaoArquivo


@dataclass(frozen=True)
class ResultadoVarredura:
    estado: str
    motor_versao: str = ''


def ler_conteudo(arquivo):
    limite = settings.MAX_BOOK_UPLOAD_SIZE
    blocos, tamanho = [], 0
    with arquivo.storage.open(arquivo.name, 'rb') as stream:
        while bloco := stream.read(min(65536, limite + 1)):
            tamanho += len(bloco)
            if tamanho > limite:
                raise ValueError('Arquivo excede o limite de varredura.')
            blocos.append(bloco)
    return b''.join(blocos)


class ClamAVScanner:
    def verificar(self, conteudo):
        executavel = settings.BOOK_CLAMSCAN_PATH
        if not executavel or not os.path.isabs(executavel) or not os.path.isfile(executavel):
            return ResultadoVarredura('erro')
        try:
            versao = subprocess.run([executavel, '--version'], capture_output=True, text=True,
                                    timeout=settings.BOOK_SCAN_TIMEOUT_SECONDS, check=True).stdout.strip()
            if not versao.startswith('ClamAV ') or len(versao) > 160:
                return ResultadoVarredura('erro')
            with tempfile.TemporaryDirectory(prefix='parabook-scan-') as pasta:
                caminho = os.path.join(pasta, 'conteudo.pdf')
                with open(caminho, 'wb') as destino:
                    destino.write(conteudo)
                resultado = subprocess.run([executavel, '--no-summary', caminho], capture_output=True,
                                           timeout=settings.BOOK_SCAN_TIMEOUT_SECONDS, check=False)
            return ResultadoVarredura({0: 'limpo', 1: 'rejeitado'}.get(resultado.returncode, 'erro'), versao)
        except (OSError, subprocess.SubprocessError):
            return ResultadoVarredura('erro')


def registrar_quarentena(arquivo):
    if not settings.BOOK_FILE_SCAN_REQUIRED or not arquivo:
        return None
    digest = hashlib.sha256(ler_conteudo(arquivo)).hexdigest()
    registro, _ = VerificacaoArquivo.objects.get_or_create(
        arquivo_nome=arquivo.name, defaults={'sha256': digest},
    )
    if registro.sha256 != digest:
        registro.sha256 = digest
        registro.estado = 'quarentena'
        registro.tentativa = uuid4()
        registro.motor_versao = ''
        registro.save()
    return registro


def verificar_arquivo(arquivo, *, scanner=None):
    conteudo = ler_conteudo(arquivo)
    digest = hashlib.sha256(conteudo).hexdigest()
    tentativa = uuid4()
    with transaction.atomic():
        registro, _ = VerificacaoArquivo.objects.select_for_update().get_or_create(
            arquivo_nome=arquivo.name, defaults={'sha256': digest},
        )
        if registro.sha256 == digest and registro.estado in {'limpo', 'rejeitado'}:
            return registro
        registro.sha256 = digest
        registro.tentativa = tentativa
        registro.estado = 'verificando'
        registro.motor_versao = ''
        registro.save()
    try:
        resultado = (scanner or ClamAVScanner()).verificar(conteudo)
        if resultado.estado not in {'limpo', 'rejeitado', 'erro'} or (resultado.estado == 'limpo' and not resultado.motor_versao):
            resultado = ResultadoVarredura('erro')
    except Exception:
        resultado = ResultadoVarredura('erro')
    with transaction.atomic():
        registro = VerificacaoArquivo.objects.select_for_update().get(pk=registro.pk)
        if registro.tentativa == tentativa:
            registro.estado = resultado.estado
            registro.motor_versao = resultado.motor_versao[:160]
            registro.save()
    return registro


def arquivo_liberado(arquivo, *, conferir_conteudo=True):
    if not arquivo:
        return False
    if not settings.BOOK_FILE_SCAN_REQUIRED:
        return True
    registro = VerificacaoArquivo.objects.filter(arquivo_nome=arquivo.name, estado='limpo').first()
    if not registro:
        return False
    if not conferir_conteudo:
        return True  # Catálogo consulta estado; entrega reconfere os bytes.
    try:
        return hashlib.sha256(ler_conteudo(arquivo)).hexdigest() == registro.sha256
    except (OSError, ValueError):
        return False


def exigir_arquivo_liberado(arquivo):
    if not arquivo_liberado(arquivo):
        raise PermissionDenied('Arquivo em quarentena ou com verificação indisponível.')


def abrir_pdf_verificado(arquivo):
    """Entrega os mesmos bytes conferidos, impedindo troca entre hash e abertura."""
    if not settings.BOOK_FILE_SCAN_REQUIRED:
        return arquivo.open('rb')
    conteudo = ler_conteudo(arquivo)
    if not VerificacaoArquivo.objects.filter(arquivo_nome=arquivo.name, estado='limpo',
                                             sha256=hashlib.sha256(conteudo).hexdigest()).exists():
        raise PermissionDenied('Arquivo em quarentena ou alterado após a verificação.')
    return BytesIO(conteudo)
