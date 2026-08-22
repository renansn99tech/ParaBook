import base64
import hashlib
import hmac
import secrets
import struct
import time
from datetime import UTC, datetime
from urllib.parse import quote

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.utils import timezone
from django.utils.crypto import salted_hmac

from usuarios.models import SessaoDispositivo


def _fernet():
    chave = hashlib.sha256(settings.SECRET_KEY.encode('utf-8')).digest()
    return Fernet(base64.urlsafe_b64encode(chave))


def criptografar_segredo(segredo):
    return _fernet().encrypt(segredo.encode('ascii')).decode('ascii')


def descriptografar_segredo(valor):
    try:
        return _fernet().decrypt(valor.encode('ascii')).decode('ascii')
    except (InvalidToken, ValueError) as exc:
        raise ValueError('Segredo de autenticação inválido.') from exc


def gerar_segredo_totp():
    return base64.b32encode(secrets.token_bytes(20)).decode('ascii').rstrip('=')


def _codigo_totp(segredo, instante=None):
    instante = int(instante or time.time())
    contador = instante // 30
    preenchido = segredo + ('=' * ((8 - len(segredo) % 8) % 8))
    chave = base64.b32decode(preenchido, casefold=True)
    digest = hmac.new(chave, struct.pack('>Q', contador), hashlib.sha1).digest()
    deslocamento = digest[-1] & 0x0F
    numero = struct.unpack('>I', digest[deslocamento:deslocamento + 4])[0] & 0x7FFFFFFF
    return f'{numero % 1_000_000:06d}'


def validar_codigo_totp(segredo, codigo):
    codigo = str(codigo or '').strip().replace(' ', '')
    if len(codigo) != 6 or not codigo.isdigit():
        return False
    agora = int(time.time())
    return any(
        hmac.compare_digest(_codigo_totp(segredo, agora + deslocamento), codigo)
        for deslocamento in (-30, 0, 30)
    )


def montar_uri_totp(usuario, segredo):
    emissor = 'ParaBook'
    conta = usuario.email or usuario.username
    rotulo = quote(f'{emissor}:{conta}')
    return f'otpauth://totp/{rotulo}?secret={segredo}&issuer={quote(emissor)}&digits=6&period=30'


def _hash_ip(request):
    encaminhado = request.META.get('HTTP_X_FORWARDED_FOR', '')
    ip = encaminhado.split(',')[0].strip() if encaminhado else request.META.get('REMOTE_ADDR', '')
    if not ip:
        return ''
    return salted_hmac('parabook.session.ip', ip).hexdigest()


def registrar_sessao(request, usuario, refresh):
    expira_em = datetime.fromtimestamp(int(refresh['exp']), tz=UTC)
    sessao = SessaoDispositivo.objects.create(
        usuario=usuario,
        refresh_jti=str(refresh['jti']),
        user_agent=request.META.get('HTTP_USER_AGENT', '')[:255],
        ip_hash=_hash_ip(request),
        expira_em=expira_em,
    )
    refresh['sid'] = str(sessao.id)
    return sessao


def renovar_sessao(sessao, refresh):
    sessao.refresh_jti = str(refresh['jti'])
    sessao.expira_em = datetime.fromtimestamp(int(refresh['exp']), tz=UTC)
    sessao.ultima_atividade_em = timezone.now()
    sessao.save(update_fields=['refresh_jti', 'expira_em', 'ultima_atividade_em'])
    refresh['sid'] = str(sessao.id)
    return sessao
