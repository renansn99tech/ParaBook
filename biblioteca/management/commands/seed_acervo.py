"""
Popula o catálogo do ParaBook com as categorias editoriais e um acervo
inicial de obras em domínio público.

REGRA DE DOMÍNIO PÚBLICO (Lei 9.610/98, art. 41)
------------------------------------------------
No Brasil a proteção dura 70 anos contados de 1º de janeiro do ano
seguinte ao da morte do autor. Em 2026, isso significa: autor falecido
até 1955, obra livre.

Toda obra desta lista foi escolhida por esse critério e o ano de morte
do autor está anotado ao lado — é o dado que sustenta a decisão, então
ele fica no código, não numa planilha à parte.

ATENÇÃO À TRADUÇÃO
------------------
A obra estar em domínio público NÃO coloca a tradução em domínio
público: a tradução é obra derivada e tem prazo próprio, contado da
morte do TRADUTOR. Por isso este comando cadastra apenas a ficha
(título, autor, ano, categoria) e deixa o PDF em branco de propósito.

Ao anexar o arquivo, use fonte de procedência conhecida:
  - Portal Domínio Público (MEC)  http://www.dominiopublico.gov.br/
  - Projeto Gutenberg            https://www.gutenberg.org/
  - Wikisource em português      https://pt.wikisource.org/

As obras marcadas com origem_lingua='pt' foram escritas em português e
não têm esse risco — são o caminho mais seguro para começar.

Uso:
    venv\\Scripts\\python.exe manage.py seed_acervo
    venv\\Scripts\\python.exe manage.py seed_acervo --dry-run
"""

from django.core.management.base import BaseCommand
from django.db import transaction

from biblioteca.models import Categoria, Livro


# Categorias editoriais. Autoria independente é uma origem/selo da obra,
# nunca uma categoria literária.
CATEGORIAS = [
    'Ficção Científica',
    'Filosofia',
    'Literatura',
    'Religião',
    'Infantis',
    'Romance',
    'Terror e Mistério',
    'História',
    'Fantasia',
    'Biografia',
    'Desenvolvimento Pessoal',
]

# (título, autor, ano da publicação original, ano de morte do autor, língua original)
ACERVO = {
    'Ficção Científica': [
        ('A Máquina do Tempo', 'H. G. Wells', 1895, 1946, 'en'),
        ('A Guerra dos Mundos', 'H. G. Wells', 1898, 1946, 'en'),
        ('Vinte Mil Léguas Submarinas', 'Júlio Verne', 1870, 1905, 'fr'),
        ('Viagem ao Centro da Terra', 'Júlio Verne', 1864, 1905, 'fr'),
        ('Frankenstein', 'Mary Shelley', 1818, 1851, 'en'),
    ],
    'Filosofia': [
        ('A República', 'Platão', -380, -347, 'grc'),
        ('Meditações', 'Marco Aurélio', 180, 180, 'grc'),
        ('Discurso do Método', 'René Descartes', 1637, 1650, 'fr'),
        ('O Príncipe', 'Nicolau Maquiavel', 1532, 1527, 'it'),
        ('Assim Falou Zaratustra', 'Friedrich Nietzsche', 1883, 1900, 'de'),
    ],
    'Literatura': [
        ('Dom Casmurro', 'Machado de Assis', 1899, 1908, 'pt'),
        ('Memórias Póstumas de Brás Cubas', 'Machado de Assis', 1881, 1908, 'pt'),
        ('O Cortiço', 'Aluísio Azevedo', 1890, 1913, 'pt'),
        ('Triste Fim de Policarpo Quaresma', 'Lima Barreto', 1915, 1922, 'pt'),
        ('Os Sertões', 'Euclides da Cunha', 1902, 1909, 'pt'),
    ],
    'Religião': [
        ('Bíblia Sagrada — Tradução de João Ferreira de Almeida', 'João Ferreira de Almeida', 1898, 1691, 'pt'),
        ('Confissões', 'Santo Agostinho', 400, 430, 'la'),
        ('A Imitação de Cristo', 'Tomás de Kempis', 1418, 1471, 'la'),
        ('O Livro dos Espíritos', 'Allan Kardec', 1857, 1869, 'fr'),
        ('Suma Teológica (seleção)', 'Tomás de Aquino', 1274, 1274, 'la'),
    ],
    'Infantis': [
        ('Reinações de Narizinho', 'Monteiro Lobato', 1931, 1948, 'pt'),
        ('Alice no País das Maravilhas', 'Lewis Carroll', 1865, 1898, 'en'),
        ('As Aventuras de Pinóquio', 'Carlo Collodi', 1883, 1890, 'it'),
        ('Contos de Grimm', 'Jacob e Wilhelm Grimm', 1812, 1863, 'de'),
        ('O Livro da Selva', 'Rudyard Kipling', 1894, 1936, 'en'),
    ],
    'Romance': [
        ('Iracema', 'José de Alencar', 1865, 1877, 'pt'),
        ('Senhora', 'José de Alencar', 1875, 1877, 'pt'),
        ('A Moreninha', 'Joaquim Manuel de Macedo', 1844, 1882, 'pt'),
        ('Amor de Perdição', 'Camilo Castelo Branco', 1862, 1890, 'pt'),
        ('Orgulho e Preconceito', 'Jane Austen', 1813, 1817, 'en'),
    ],
    'Terror e Mistério': [
        ('Drácula', 'Bram Stoker', 1897, 1912, 'en'),
        ('O Médico e o Monstro', 'Robert Louis Stevenson', 1886, 1894, 'en'),
        ('Contos Extraordinários', 'Edgar Allan Poe', 1845, 1849, 'en'),
        ('O Retrato de Dorian Gray', 'Oscar Wilde', 1890, 1900, 'en'),
        ('As Aventuras de Sherlock Holmes', 'Arthur Conan Doyle', 1892, 1930, 'en'),
    ],
    'História': [
        ('Capítulos de História Colonial', 'Capistrano de Abreu', 1907, 1927, 'pt'),
        ('História Geral do Brasil', 'Francisco Adolfo de Varnhagen', 1854, 1878, 'pt'),
        ('A Retirada da Laguna', 'Visconde de Taunay', 1871, 1899, 'pt'),
        ('História da Guerra do Peloponeso', 'Tucídides', -400, -400, 'grc'),
        ('Comentários sobre a Guerra das Gálias', 'Júlio César', -50, -44, 'la'),
    ],
    'Fantasia': [
        ('As Mil e Uma Noites', 'Anônimo', 1704, 0, 'ar'),
        ('A Divina Comédia', 'Dante Alighieri', 1320, 1321, 'it'),
        ('As Viagens de Gulliver', 'Jonathan Swift', 1726, 1745, 'en'),
        ('O Maravilhoso Mágico de Oz', 'L. Frank Baum', 1900, 1919, 'en'),
        ('Peter Pan', 'J. M. Barrie', 1911, 1937, 'en'),
    ],
    'Biografia': [
        ('Minha Formação', 'Joaquim Nabuco', 1900, 1910, 'pt'),
        ('Um Estadista do Império', 'Joaquim Nabuco', 1897, 1910, 'pt'),
        ('Autobiografia de Benjamin Franklin', 'Benjamin Franklin', 1791, 1790, 'en'),
        ('Vidas Paralelas', 'Plutarco', 100, 120, 'grc'),
        ('Confissões', 'Jean-Jacques Rousseau', 1782, 1778, 'fr'),
    ],
    'Desenvolvimento Pessoal': [
        ('Ajuda-te a Ti Mesmo', 'Samuel Smiles', 1859, 1904, 'en'),
        ('Como um Homem Pensa', 'James Allen', 1903, 1912, 'en'),
        ('A Ciência de Ficar Rico', 'Wallace D. Wattles', 1910, 1911, 'en'),
        ('Cartas a Lucílio', 'Sêneca', 65, 65, 'la'),
        ('Ensaios', 'Ralph Waldo Emerson', 1841, 1882, 'en'),
    ],
}

# Ano de referência do cálculo de domínio público. Constante explícita
# para o comando não mudar de comportamento sozinho na virada do ano.
ANO_CORRENTE = 2026
LIMITE_OBITO = ANO_CORRENTE - 70


class Command(BaseCommand):
    help = 'Cria as categorias editoriais e o acervo inicial de obras em domínio público.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Mostra o que seria criado, sem gravar nada no banco.',
        )

    @transaction.atomic
    def handle(self, *args, **options):
        simulacao = options['dry_run']

        cat_criadas = cat_existentes = 0
        livros_criados = livros_existentes = 0
        alertas = []

        for nome in CATEGORIAS:
            if simulacao:
                existe = Categoria.objects.filter(nome=nome).exists()
                criada = not existe
                categoria = None if criada else Categoria.objects.get(nome=nome)
            else:
                categoria, criada = Categoria.objects.get_or_create(nome=nome)

            if criada:
                cat_criadas += 1
                self.stdout.write(self.style.SUCCESS(f'  + categoria: {nome}'))
            else:
                cat_existentes += 1

            for titulo, autor, ano_obra, obito, lingua in ACERVO.get(nome, []):
                # Trava de segurança: se a data não sustentar o domínio
                # público, a obra não entra. Vale mais um catálogo menor
                # do que um problema autoral.
                if obito > LIMITE_OBITO:
                    alertas.append(
                        f'{titulo} ({autor}) — autor falecido em {obito}, '
                        f'protegido até {obito + 71}. NÃO cadastrado.'
                    )
                    continue

                # O título sozinho não identifica a obra: "Confissões" é
                # de Agostinho e de Rousseau. A chave é título + autor.
                ja_existe = Livro.objects.filter(titulo=titulo, autor=autor).exists()
                if ja_existe:
                    livros_existentes += 1
                    continue

                livros_criados += 1
                if lingua != 'pt':
                    alertas.append(
                        f'{titulo} ({autor}) — original em "{lingua}". '
                        f'Ao anexar o PDF, confirme que a TRADUÇÃO também é livre.'
                    )

                if simulacao:
                    self.stdout.write(f'  + livro: {titulo} — {autor}')
                    continue

                Livro.objects.create(
                    titulo=titulo,
                    autor=autor,
                    ano_publicacao=ano_obra if ano_obra > 0 else None,
                    categoria=categoria,
                    origem='dominio_publico',
                    status='publicado',
                    edicao='Domínio público',
                )
                self.stdout.write(f'  + livro: {titulo} — {autor}')

        self.stdout.write('')
        self.stdout.write(self.style.MIGRATE_HEADING('Resumo'))
        self.stdout.write(f'  categorias: {cat_criadas} criadas, {cat_existentes} já existiam')
        self.stdout.write(f'  livros    : {livros_criados} criados, {livros_existentes} já existiam')

        if alertas:
            self.stdout.write('')
            self.stdout.write(self.style.WARNING(f'Pendências de curadoria ({len(alertas)}):'))
            for alerta in alertas:
                self.stdout.write(self.style.WARNING(f'  ! {alerta}'))
            self.stdout.write('')
            self.stdout.write(
                '  As fichas foram criadas SEM arquivo. Anexe os PDFs pelo painel\n'
                '  (Admin > Livros), usando Domínio Público (MEC), Gutenberg ou\n'
                '  Wikisource — e confira a licença da tradução antes de subir.'
            )

        if simulacao:
            self.stdout.write('')
            self.stdout.write(self.style.NOTICE('Simulação: nada foi gravado.'))
            transaction.set_rollback(True)
