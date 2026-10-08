"""Varredura G4: motor local explícito, resultado por conteúdo e falha fechada.

Validação estrutural do PDF continua sendo uma etapa independente. Adaptadores
sintéticos são injetados somente pelos testes; nenhum endpoint declara limpo.
"""
from dataclasses import dataclass
from datetime import timedelta
from functools import lru_cache
import hashlib
from io import BytesIO
import os
import subprocess
import tempfile
from pathlib import Path
from uuid import uuid4

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied

from .models import VerificacaoArquivo


@dataclass(frozen=True)
class ResultadoVarredura:
    estado: str
    motor_versao: str = ''


@dataclass(frozen=True)
class ContextoVarredura:
    motor_versao: str
    assinaturas_sha256: str


@lru_cache(maxsize=4)
def _hash_assinaturas(inventario):
    digest = hashlib.sha256()
    for nome, tamanho, modificacao in inventario:
        digest.update(Path(nome).name.encode())
        with open(nome, 'rb') as stream:
            while bloco := stream.read(65536):
                digest.update(bloco)
        stat = os.stat(nome)
        if stat.st_size != tamanho or stat.st_mtime_ns != modificacao:
            raise ValueError('Assinaturas alteradas durante a identificação.')
    return digest.hexdigest()


def contexto_atual():
    """Identifica motor e bytes das assinaturas locais; não executa updater na API."""
    executavel = settings.BOOK_CLAMSCAN_PATH
    pasta = Path(settings.BOOK_SCAN_DATABASE_DIR)
    if not executavel or not os.path.isabs(executavel) or not os.path.isfile(executavel) or not pasta.is_absolute():
        return None
    try:
        arquivos = sorted(p for p in pasta.iterdir() if not p.name.startswith('.')
                          and p.name != 'freshclam.dat' and p.suffix.lower() not in {'.tmp', '.lock'} and p.is_file())
        if not arquivos or any(p.is_symlink() or not p.is_file() or not p.stat().st_size for p in arquivos):
            return None
        daily = next((p for p in arquivos if p.name in {'daily.cvd', 'daily.cld'}), None)
        if daily:
            with daily.open('rb') as stream:
                cabecalho = stream.read(512).decode('ascii').strip().split(':')
            if cabecalho[0] != 'ClamAV-VDB':
                return None
            atualizado = float(cabecalho[8].strip())
        else:
            if not (settings.DEBUG and settings.BOOK_SCAN_ALLOW_TEST_DATABASE):
                return None
            # Banco privado de ensaio: identificar explicitamente, nunca chamá-lo Talos.
            atualizado = max(p.stat().st_mtime for p in arquivos)
        agora = timezone.now().timestamp()
        if settings.BOOK_SCAN_MAX_AGE_HOURS <= 0 or settings.BOOK_SCAN_SIGNATURE_MAX_AGE_HOURS <= 0:
            return None
        if not 0 <= agora - atualizado <= settings.BOOK_SCAN_SIGNATURE_MAX_AGE_HOURS * 3600:
            return None
        inventario = tuple((str(p), p.stat().st_size, p.stat().st_mtime_ns) for p in arquivos)
        digest = _hash_assinaturas(inventario)
        motor_stat = os.stat(executavel)
        versao = _versao_motor(executavel, motor_stat.st_mtime_ns, motor_stat.st_size,
                              settings.BOOK_SCAN_TIMEOUT_SECONDS, digest)
        if not versao.startswith('ClamAV ') or len(versao) > 160:
            return None
        return ContextoVarredura(versao, digest)
    except (OSError, ValueError, IndexError, UnicodeError, subprocess.SubprocessError):
        return None


@lru_cache(maxsize=4)
def _versao_motor(executavel, modificacao, tamanho, timeout, assinaturas):
    return subprocess.run([executavel, '--version'], capture_output=True, text=True,
                          timeout=timeout, check=True).stdout.strip()


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
        contexto = contexto_atual()
        if not contexto:
            return ResultadoVarredura('erro')
        try:
            with tempfile.TemporaryDirectory(prefix='parabook-scan-') as pasta:
                caminho = os.path.join(pasta, 'conteudo.pdf')
                with open(caminho, 'wb') as destino:
                    destino.write(conteudo)
                resultado = subprocess.run([executavel, '--database', settings.BOOK_SCAN_DATABASE_DIR,
                                            '--no-summary', caminho], capture_output=True,
                                           timeout=settings.BOOK_SCAN_TIMEOUT_SECONDS, check=False)
            return ResultadoVarredura({0: 'limpo', 1: 'rejeitado'}.get(resultado.returncode, 'erro'), contexto.motor_versao)
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
        registro.assinaturas_sha256 = ''
        registro.verificado_em = None
        registro.valido_ate = None
        registro.save()
    return registro


def verificar_arquivo(arquivo, *, scanner=None):
    conteudo = ler_conteudo(arquivo)
    digest = hashlib.sha256(conteudo).hexdigest()
    tentativa = uuid4()
    contexto = contexto_atual()
    with transaction.atomic():
        registro, _ = VerificacaoArquivo.objects.select_for_update().get_or_create(
            arquivo_nome=arquivo.name, defaults={'sha256': digest},
        )
        if registro.sha256 == digest and registro.estado in {'limpo', 'rejeitado'} and _resultado_atual(registro, contexto):
            return registro
        registro.sha256 = digest
        registro.tentativa = tentativa
        registro.estado = 'verificando'
        registro.motor_versao = ''
        registro.assinaturas_sha256 = ''
        registro.verificado_em = None
        registro.valido_ate = None
        registro.save()
    try:
        resultado = (scanner or ClamAVScanner()).verificar(conteudo) if contexto else ResultadoVarredura('erro')
        if (resultado.estado not in {'limpo', 'rejeitado', 'erro'}
                or (resultado.estado in {'limpo', 'rejeitado'} and (not contexto or resultado.motor_versao != contexto.motor_versao))
                or contexto_atual() != contexto):
            resultado = ResultadoVarredura('erro')
    except Exception:
        resultado = ResultadoVarredura('erro')
    with transaction.atomic():
        registro = VerificacaoArquivo.objects.select_for_update().get(pk=registro.pk)
        if registro.tentativa == tentativa:
            registro.estado = resultado.estado
            registro.motor_versao = resultado.motor_versao[:160]
            registro.assinaturas_sha256 = contexto.assinaturas_sha256 if contexto and resultado.estado != 'erro' else ''
            registro.verificado_em = timezone.now()
            registro.valido_ate = registro.verificado_em + timedelta(hours=settings.BOOK_SCAN_MAX_AGE_HOURS)
            registro.save()
    return registro


def _resultado_atual(registro, contexto):
    return bool(contexto and registro.valido_ate and registro.valido_ate > timezone.now()
                and registro.motor_versao == contexto.motor_versao
                and registro.assinaturas_sha256 == contexto.assinaturas_sha256)


def arquivo_liberado(arquivo, *, conferir_conteudo=True):
    if not arquivo:
        return False
    registro = VerificacaoArquivo.objects.filter(arquivo_nome=arquivo.name).first()
    if not registro:
        return not settings.BOOK_FILE_SCAN_REQUIRED
    if registro.estado != 'limpo' or not _resultado_atual(registro, contexto_atual()):
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
    if not settings.BOOK_FILE_SCAN_REQUIRED and not VerificacaoArquivo.objects.filter(arquivo_nome=arquivo.name).exists():
        return arquivo.open('rb')
    conteudo = ler_conteudo(arquivo)
    registro = VerificacaoArquivo.objects.filter(arquivo_nome=arquivo.name, estado='limpo',
                                                sha256=hashlib.sha256(conteudo).hexdigest()).first()
    if not registro or not _resultado_atual(registro, contexto_atual()):
        raise PermissionDenied('Arquivo em quarentena ou alterado após a verificação.')
    return BytesIO(conteudo)
