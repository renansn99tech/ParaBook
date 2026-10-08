import json
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.core.serializers.json import DjangoJSONEncoder

from usuarios.models_moderacao import CasoModeracao
from usuarios.moderacao import preview_retencao_caso


class Command(BaseCommand):
    help = 'Prévia G3/G5 mínima, somente leitura, de um protocolo. Não executa descarte.'

    def add_arguments(self, parser):
        parser.add_argument('--protocolo', required=True, type=UUID)

    def handle(self, *args, **options):
        caso = CasoModeracao.objects.filter(protocolo=options['protocolo']).first()
        if not caso:
            raise CommandError('Protocolo não localizado neste banco.')
        self.stdout.write(json.dumps({'somente_leitura': True, **preview_retencao_caso(caso)},
                                    cls=DjangoJSONEncoder, ensure_ascii=False, indent=2))
