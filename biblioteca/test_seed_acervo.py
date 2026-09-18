from io import StringIO
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase

from biblioteca.management.commands.seed_acervo import ACERVO, CATEGORIAS
from biblioteca.models import Categoria, Livro


class SeedAcervoTests(TestCase):
    def executar_seed(self, **options):
        saida = StringIO()
        call_command('seed_acervo', stdout=saida, **options)
        return saida.getvalue()

    def test_catalogo_base_tem_11_categorias_e_55_livros(self):
        self.assertEqual(len(CATEGORIAS), 11)
        self.assertEqual(sum(len(livros) for livros in ACERVO.values()), 55)
        self.assertEqual(set(CATEGORIAS), set(ACERVO))
        pares = [
            (titulo, autor)
            for livros in ACERVO.values()
            for titulo, autor, *_ in livros
        ]
        self.assertEqual(len(pares), len(set(pares)))

    def test_dry_run_nao_grava_nem_altera_usuarios(self):
        usuario = User.objects.create(username='seed-test')

        saida = self.executar_seed(dry_run=True)

        self.assertEqual(Categoria.objects.count(), 0)
        self.assertEqual(Livro.objects.count(), 0)
        usuario.refresh_from_db()
        self.assertEqual(usuario.username, 'seed-test')
        self.assertIn('Simulação: nada foi gravado.', saida)

    def test_execucao_em_banco_vazio_e_idempotente(self):
        self.executar_seed()

        self.assertEqual(Categoria.objects.count(), 11)
        self.assertEqual(Livro.objects.count(), 55)
        self.assertEqual(Livro.objects.filter(status='publicado').count(), 55)

        self.executar_seed()

        self.assertEqual(Categoria.objects.count(), 11)
        self.assertEqual(Livro.objects.count(), 55)
        self.assertEqual(Livro.objects.filter(status='publicado').count(), 55)

    def test_preserva_livro_existente_com_mesmo_titulo_e_autor(self):
        categoria_existente = Categoria.objects.create(nome='Categoria preservada')
        livro_existente = Livro.objects.create(
            titulo='Dom Casmurro',
            autor='Machado de Assis',
            categoria=categoria_existente,
            status='pendente',
            edicao='Edição já cadastrada',
        )

        self.executar_seed()

        livro_existente.refresh_from_db()
        self.assertEqual(livro_existente.categoria, categoria_existente)
        self.assertEqual(livro_existente.status, 'pendente')
        self.assertEqual(livro_existente.edicao, 'Edição já cadastrada')
        self.assertEqual(
            Livro.objects.filter(titulo='Dom Casmurro', autor='Machado de Assis').count(),
            1,
        )
        self.assertEqual(Livro.objects.count(), 55)

    def test_falha_reverte_toda_a_transacao(self):
        original_create = Livro.objects.create
        chamadas = 0

        def falhar_no_segundo_livro(*args, **kwargs):
            nonlocal chamadas
            chamadas += 1
            if chamadas == 2:
                raise RuntimeError('falha simulada')
            return original_create(*args, **kwargs)

        with self.assertRaisesRegex(RuntimeError, 'falha simulada'):
            with patch.object(Livro.objects, 'create', side_effect=falhar_no_segundo_livro):
                self.executar_seed()

        self.assertEqual(Categoria.objects.count(), 0)
        self.assertEqual(Livro.objects.count(), 0)
