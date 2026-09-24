from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase
from django.urls import reverse

from biblioteca.models import Biblioteca, Categoria, Livro
from comunidades.models import Comunidade, PostagemComunidade
from dashboard.models import FeatureFlag
from usuarios.models import AuditoriaAcao


class ConteudoDemonstrativoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = User.objects.create_superuser('admin-demo', 'admin@example.test', 'senha-segura')
        cls.leitor = User.objects.create_user('leitor-demo', password='senha-segura')
        FeatureFlag.objects.update_or_create(
            chave='conteudo_demonstrativo',
            defaults={'descricao': 'Conteúdo de exemplo', 'habilitada': True, 'disponivel': True},
        )

    def seed(self):
        call_command('seed_demonstrativo', if_needed=True, stdout=StringIO())

    def test_seed_idempotente_sem_interacoes_ou_arquivos(self):
        self.seed()
        self.seed()

        self.assertEqual(Categoria.objects.count(), 11)
        self.assertEqual(Livro.objects.filter(chave_demonstrativa__isnull=False).count(), 55)
        self.assertEqual(Comunidade.objects.filter(chave_demonstrativa__isnull=False).count(), 4)
        self.assertFalse(Biblioteca.objects.exists())
        self.assertFalse(PostagemComunidade.objects.exists())
        self.assertFalse(any(livro.pdf for livro in Livro.objects.all()))
        self.assertFalse(any(comunidade.membros.exists() for comunidade in Comunidade.objects.all()))

    def test_flag_oculta_catalogo_e_comunidades_sem_apagar(self):
        self.seed()
        livro = Livro.objects.filter(chave_demonstrativa__isnull=False).exclude(
            categoria__nome='Infantis',
        ).first()
        comunidade = Comunidade.objects.get(chave_demonstrativa='demo-clube-leitura')

        self.assertEqual(len(self.client.get(reverse('livro-list')).json()), 50)
        self.assertEqual(len(self.client.get(reverse('comunidade-list')).json()), 4)
        self.assertTrue(self.client.get(reverse('livro-detail', args=[livro.pk])).json()['demonstrativo'])
        self.assertTrue(self.client.get(reverse('comunidade-detail', args=[comunidade.pk])).json()['demonstrativo'])

        FeatureFlag.objects.filter(chave='conteudo_demonstrativo').update(habilitada=False)
        self.assertEqual(len(self.client.get(reverse('livro-list')).json()), 0)
        self.assertEqual(len(self.client.get(reverse('comunidade-list')).json()), 0)
        self.assertEqual(self.client.get(reverse('livro-detail', args=[livro.pk])).status_code, 404)
        self.assertEqual(self.client.get(reverse('comunidade-detail', args=[comunidade.pk])).status_code, 404)
        self.assertEqual(Livro.objects.count(), 55)
        self.assertEqual(Comunidade.objects.count(), 4)

        self.client.force_login(self.admin)
        self.assertEqual(len(self.client.get(reverse('livro-list')).json()), 0)
        self.assertEqual(len(self.client.get(reverse('comunidade-list')).json()), 0)

        FeatureFlag.objects.filter(chave='conteudo_demonstrativo').update(habilitada=True)
        self.assertEqual(len(self.client.get(reverse('livro-list')).json()), 55)
        self.assertEqual(len(self.client.get(reverse('comunidade-list')).json()), 4)

    def test_interacoes_demonstrativas_sao_bloqueadas(self):
        self.seed()
        livro = Livro.objects.filter(chave_demonstrativa__isnull=False).first()
        comunidade = Comunidade.objects.get(chave_demonstrativa='demo-clube-leitura')
        self.client.force_login(self.leitor)

        self.assertEqual(self.client.post(reverse('estante-list'), {'livro': livro.pk}).status_code, 400)
        self.assertEqual(self.client.get(reverse('livro-ler-pdf', args=[livro.pk])).status_code, 403)
        self.assertEqual(self.client.post(reverse('comunidade-entrar', args=[comunidade.pk])).status_code, 403)
        self.assertEqual(
            self.client.post(reverse('postagem-comunidade-list'), {
                'comunidade': comunidade.pk, 'titulo': 'Teste', 'conteudo': 'Texto',
            }).status_code,
            403,
        )
        self.assertFalse(Biblioteca.objects.exists())
        self.assertFalse(comunidade.membros.exists())
        self.assertFalse(PostagemComunidade.objects.exists())

    def test_admin_alterna_flag_com_auditoria_e_leitor_nao_pode(self):
        self.seed()
        url = reverse('api-dashboard-feature-flags')
        self.client.force_login(self.leitor)
        self.assertEqual(
            self.client.patch(
                url, {'chave': 'conteudo_demonstrativo', 'habilitada': False},
                content_type='application/json',
            ).status_code,
            403,
        )

        self.client.force_login(self.admin)
        resposta = self.client.patch(
            url, {'chave': 'conteudo_demonstrativo', 'habilitada': False},
            content_type='application/json',
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertFalse(FeatureFlag.objects.get(chave='conteudo_demonstrativo').habilitada)
        self.assertEqual(len(self.client.get(reverse('livro-list')).json()), 0)
        self.assertEqual(len(self.client.get(reverse('comunidade-list')).json()), 0)
        self.assertTrue(AuditoriaAcao.objects.filter(
            ator=self.admin,
            acao='feature_flag.alterada',
            metadados__chave='conteudo_demonstrativo',
        ).exists())

        resposta = self.client.patch(
            url, {'chave': 'conteudo_demonstrativo', 'habilitada': True},
            content_type='application/json',
        )
        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(self.client.get(reverse('livro-list')).json()), 55)
        self.assertEqual(len(self.client.get(reverse('comunidade-list')).json()), 4)
