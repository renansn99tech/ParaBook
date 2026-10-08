"""Formato mínimo assinado pelo custodiante; independente de Django/storage."""
import base64
import json

from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey


def canonicalizar(dados):
    return json.dumps(dados, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')


def verificar_recibo(recibo, chave_publica):
    if type(recibo) is not dict or set(recibo) != {'dados', 'assinatura'}:
        raise ValueError('Recibo inválido.')
    conteudo = canonicalizar(recibo['dados'])
    if len(conteudo) > 4096:
        raise ValueError('Recibo excede o limite.')
    chave = Ed25519PublicKey.from_public_bytes(base64.b64decode(chave_publica, validate=True))
    chave.verify(base64.b64decode(recibo['assinatura'], validate=True), conteudo)
    return recibo['dados']
