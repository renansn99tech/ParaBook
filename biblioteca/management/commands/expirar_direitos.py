from django.core.management.base import BaseCommand
from django.db import transaction

from biblioteca.direitos import estado_direitos
from biblioteca.models import Livro
from biblioteca.publicacao import _registrar


class Command(BaseCommand):
    help = 'Prévia de expiração de direitos; --aplicar registra estado e auditoria, sem apagar arquivos.'

    def add_arguments(self, parser):
        parser.add_argument('--aplicar', action='store_true')

    def handle(self, *args, **options):
        quantidade = 0
        for livro_id in Livro.objects.filter(status='publicado', licencas__isnull=False).values_list('id', flat=True).distinct():
            with transaction.atomic():
                livro = Livro.objects.select_for_update().get(pk=livro_id)
                if livro.status != 'publicado' or estado_direitos(livro) != 'expirada':
                    continue
                quantidade += 1
                if options['aplicar']:
                    livro.status = 'expirado'
                    livro.save(update_fields=['status'])
                    _registrar(None, livro, 'direitos_expirados', 'publicado')
        self.stdout.write(f'Obras expiradas: {quantidade}; aplicada: {bool(options["aplicar"])}. Arquivos preservados.')
