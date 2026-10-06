import json
from django.core.management.base import BaseCommand
from usuarios.operacao_moderacao import fila_pendente


class Command(BaseCommand):
    help = 'Prévia mínima e somente leitura da fila G3; não atribui responsáveis ou prioridades.'

    def handle(self, *args, **options):
        self.stdout.write(json.dumps({'somente_leitura': True, 'itens': fila_pendente(),
                                     'comunicacao_externa': False}, default=str, ensure_ascii=False))
