"""Custódia offline separada. Não importa settings, ORM ou storage do runtime.

Executar em identidade/host próprio. O runtime recebe exclusivamente a chave
pública e o recibo; o diretório e as chaves privadas pertencem ao custodiante.
"""
import base64
import json
import os
from pathlib import Path
from uuid import UUID, uuid4

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from .recibos_direitos import canonicalizar

LIMITE_DOCUMENTO = 5 * 1024 * 1024


def _gravar_novo(caminho, conteudo):
    fd = os.open(caminho, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'wb') as stream:
        stream.write(conteudo)


class CofreDireitos:
    def __init__(self, raiz):
        self.raiz = Path(raiz).resolve()
        repositorio = Path(__file__).resolve().parents[1]
        if self.raiz.is_relative_to(repositorio):
            raise ValueError('Cofre e credenciais devem ficar fora do repositório e da mídia da aplicação.')

    def inicializar(self, chave_id):
        if not chave_id or len(chave_id) > 60:
            raise ValueError('Identificador de custodiante inválido.')
        self.raiz.mkdir(parents=True, exist_ok=True, mode=0o700)
        privada = Ed25519PrivateKey.generate()
        credencial = {
            'chave_id': chave_id, 'fernet': Fernet.generate_key().decode(),
            'ed25519': base64.b64encode(privada.private_bytes_raw()).decode(),
        }
        _gravar_novo(self.raiz / 'credencial.json', canonicalizar(credencial))
        return {chave_id: base64.b64encode(privada.public_key().public_bytes_raw()).decode()}

    def _credencial(self):
        return json.loads((self.raiz / 'credencial.json').read_text('utf-8'))

    def custodiar(self, documento, dados, condicoes):
        """Só o custodiante autorizado, após conferência humana, emite o recibo."""
        if not isinstance(documento, bytes) or not 0 < len(documento) <= LIMITE_DOCUMENTO:
            raise ValueError('Documento ausente ou acima do limite.')
        obrigatorios = {'titularidade', 'fonte', 'retirada', 'exclusividade', 'sublicenca', 'responsavel'}
        if type(condicoes) is not dict or set(condicoes) != obrigatorios or any(
            not isinstance(valor, str) or not valor.strip() or len(valor) > 2000 for valor in condicoes.values()
        ):
            raise ValueError('Conferência exige condições completas e responsável.')
        credencial = self._credencial()
        referencia = str(uuid4())
        payload = {**dados, 'schema': 'parabook-direitos-v1', 'referencia': referencia,
                   'chave_id': credencial['chave_id']}
        pacote = canonicalizar({'documento': base64.b64encode(documento).decode(),
                                'condicoes': condicoes, 'recibo': payload})
        cifrado = Fernet(credencial['fernet'].encode()).encrypt(pacote)
        _gravar_novo(self.raiz / f'{referencia}.prova', cifrado)
        assinatura = Ed25519PrivateKey.from_private_bytes(base64.b64decode(credencial['ed25519'])).sign(canonicalizar(payload))
        return {'dados': payload, 'assinatura': base64.b64encode(assinatura).decode()}

    def consultar(self, referencia):
        referencia = str(UUID(str(referencia)))
        credencial = self._credencial()
        cifrado = (self.raiz / f'{referencia}.prova').read_bytes()
        return json.loads(Fernet(credencial['fernet'].encode()).decrypt(cifrado))
