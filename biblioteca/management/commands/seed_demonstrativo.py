"""Cria fichas e comunidades de demonstração sem apagar conteúdo existente."""

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from comunidades.models import Comunidade


COMUNIDADES_DEMONSTRATIVAS = (
    (
        'demo-clube-leitura',
        'Demonstração · Clube de Leitura',
        'Exemplo de espaço para conversar sobre leituras em grupo. '
        'Esta comunidade é apenas demonstrativa e não aceita participação.',
    ),
    (
        'demo-autores-independentes',
        'Demonstração · Autores Independentes',
        'Exemplo de encontro entre autores e leitores. '
        'Esta comunidade é apenas demonstrativa e não aceita participação.',
    ),
    (
        'demo-fantasia-ficcao',
        'Demonstração · Fantasia e Ficção Científica',
        'Exemplo de debate sobre mundos imaginários e futuros possíveis. '
        'Esta comunidade é apenas demonstrativa e não aceita participação.',
    ),
    (
        'demo-literatura-paraense',
        'Demonstração · Literatura Paraense',
        'Exemplo de espaço dedicado à produção literária do Pará. '
        'Esta comunidade é apenas demonstrativa e não aceita participação.',
    ),
)


class Command(BaseCommand):
    help = 'Prepara dados demonstrativos de biblioteca e comunidades.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--if-needed', action='store_true',
            help='Não reprocessa as fichas ou comunidades já presentes.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        call_command('seed_acervo', if_needed=options['if_needed'], stdout=self.stdout)

        criadas = 0
        for chave, nome, descricao in COMUNIDADES_DEMONSTRATIVAS:
            _, criada = Comunidade.objects.get_or_create(
                chave_demonstrativa=chave,
                defaults={
                    'nome': nome,
                    'descricao': descricao,
                    'criada_por_sistema': True,
                    'criador': None,
                    'max_participantes': 0,
                },
            )
            criadas += int(criada)

        self.stdout.write(
            self.style.SUCCESS(
                f'Comunidades demonstrativas: {criadas} criadas, '
                f'{len(COMUNIDADES_DEMONSTRATIVAS) - criadas} preservadas.'
            )
        )
