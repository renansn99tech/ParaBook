from django.core.management.base import BaseCommand
from gamificacao.models import Conquista

class Command(BaseCommand):
    help = 'Popula o banco de dados com as conquistas padrão de gamificação.'

    def handle(self, *args, **options):
        conquistas_iniciais = [
            # Leitura
            {
                'slug': 'primeira_leitura_concluida',
                'nome': 'O Primeiro Capítulo',
                'descricao': 'Concluiu a leitura do seu primeiro livro na plataforma.',
                'icone': 'fa-solid fa-book-open',
                'categoria': 'leitura',
                'pontos_recompensa': 50
            },
            {
                'slug': 'leitor_assiduo',
                'nome': 'Leitor Assíduo',
                'descricao': 'Manteve uma sequência de 7 dias consecutivos de leitura.',
                'icone': 'fa-solid fa-fire',
                'categoria': 'leitura',
                'pontos_recompensa': 150
            },
            # Comunidade
            {
                'slug': 'primeira_avaliacao',
                'nome': 'Crítico Literário',
                'descricao': 'Deixou sua primeira avaliação em uma obra.',
                'icone': 'fa-solid fa-star',
                'categoria': 'comunidade',
                'pontos_recompensa': 30
            },
            {
                'slug': 'primeiro_favorito',
                'nome': 'Coração de Leitor',
                'descricao': 'Adicionou o primeiro livro aos favoritos.',
                'icone': 'fa-solid fa-heart',
                'categoria': 'comunidade',
                'pontos_recompensa': 20
            },
            # Assinatura
            {
                'slug': 'assinatura_premium',
                'nome': 'Membro Premium',
                'descricao': 'Assinou o plano Premium e apoia a plataforma.',
                'icone': 'fa-solid fa-crown',
                'categoria': 'assinatura',
                'pontos_recompensa': 500
            }
        ]

        criadas = 0
        for dados in conquistas_iniciais:
            conquista, created = Conquista.objects.get_or_create(
                slug=dados['slug'],
                defaults=dados
            )
            if created:
                criadas += 1
                self.stdout.write(self.style.SUCCESS(f"Conquista criada: {conquista.nome}"))
            else:
                self.stdout.write(self.style.WARNING(f"Conquista já existente: {conquista.nome}"))

        self.stdout.write(self.style.SUCCESS(f'\nTotal de conquistas novas inseridas: {criadas}'))
