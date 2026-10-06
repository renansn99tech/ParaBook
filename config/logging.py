import json
import logging
from datetime import datetime, timezone


class JsonFormatter(logging.Formatter):
    def format(self, record):
        # Logs comuns não são a superfície de evidência restrita. Nunca usar
        # getMessage()/formatException(): ambos podem reproduzir SQL, payloads,
        # URLs assinadas, nomes de pessoas e segredos em exceções.
        componentes = {'django', 'usuarios', 'biblioteca', 'comunidades', 'perfis', 'assinaturas', 'gamificacao', 'config', 'gunicorn'}
        componente = record.name.split('.')[0]
        payload = {
            'timestamp': datetime.now(timezone.utc).isoformat(),
            'level': record.levelname,
            'componente_codigo': componente if componente in componentes else 'outro',
            'evento_codigo': 'erro_tecnico' if record.levelno >= logging.ERROR else 'evento_tecnico',
        }
        if getattr(record, 'evento_codigo', None) in {'auditoria_falhou', 'pdf_abertura_falhou', 'gamificacao_falhou'}:
            payload['evento_codigo'] = record.evento_codigo
        status = getattr(record, 'status_code', None)
        if record.name == 'gunicorn.access' and isinstance(record.args, dict):
            candidato = record.args.get('s')
            if isinstance(candidato, str) and len(candidato) == 3 and candidato.isdecimal():
                status = int(candidato)
            duracao = record.args.get('M')
            if type(duracao) in {int, float} and 0 <= duracao <= 3600000:
                payload['duracao_ms'] = duracao
        if type(status) is int and 100 <= status <= 599:
            payload['status_http'] = status
        if record.exc_info:
            codigos = {'ValueError', 'PermissionError', 'OSError', 'IntegrityError', 'ProtectedError', 'ValidationError'}
            codigo = record.exc_info[0].__name__
            payload['erro_codigo'] = codigo if codigo in codigos else 'erro_tecnico'
        return json.dumps(payload, ensure_ascii=False)
