from django.core.management.base import BaseCommand, CommandError
from biblioteca.models import Livro, TentativaPublicacao
from biblioteca.quarentena import verificar_arquivo


class Command(BaseCommand):
    help = 'Varre um PDF privado com ClamAV local configurado; não publica nem remove a obra.'

    def add_arguments(self, parser):
        grupo = parser.add_mutually_exclusive_group(required=True)
        grupo.add_argument('--livro-id', type=int)
        grupo.add_argument('--tentativa-id', type=int)
        parser.add_argument('--amostra', action='store_true')

    def handle(self, *args, **options):
        modelo = TentativaPublicacao if options['tentativa_id'] else Livro
        registro = modelo.objects.filter(pk=options['tentativa_id'] or options['livro_id']).first()
        arquivo = getattr(registro, 'pdf_amostra' if options['amostra'] else 'pdf', None)
        if not arquivo:
            raise CommandError('PDF não localizado.')
        try:
            resultado = verificar_arquivo(arquivo)
        except (OSError, ValueError) as exc:
            raise CommandError('Não foi possível acessar o PDF dentro do limite configurado.') from exc
        self.stdout.write(f'Estado: {resultado.estado}; SHA-256: {resultado.sha256}; publicação não alterada.')
