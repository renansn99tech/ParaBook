import json
from uuid import UUID

from django.core.management.base import BaseCommand, CommandError
from django.core.serializers.json import DjangoJSONEncoder

from usuarios.models import EncerramentoConta
from usuarios.privacidade_descarte import preview_descarte
from usuarios.privacidade_provas import preview_prova


class Command(BaseCommand):
    help = 'Preview sem escrita da retenção por destino de um único protocolo. Não executa purga.'

    def add_arguments(self, parser):
        parser.add_argument('--protocolo', required=True, type=UUID)

    def handle(self, *args, **options):
        encerramento = EncerramentoConta.objects.filter(protocolo=options['protocolo']).first()
        if not encerramento:
            raise CommandError('Protocolo não localizado neste banco.')
        documento = preview_descarte(encerramento)
        documento['provas'] = [preview_prova(prova) for prova in encerramento.provas.order_by('pk')]
        documento['registro_minimo_ate'] = encerramento.prova_ate
        self.stdout.write(json.dumps(documento, cls=DjangoJSONEncoder, ensure_ascii=False, indent=2))
