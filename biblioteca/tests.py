from django.test import TestCase
from django.urls import reverse
from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.contrib.staticfiles import finders
from rest_framework.test import APIClient

from biblioteca.models import Categoria
from biblioteca.models import Livro
from biblioteca.api.serializers import SolicitacaoPublicacaoSerializer


class ListaAutoresViewTests(TestCase):
    def test_lista_autores_nao_gera_nameerror(self):
        # Regressao: Usuario nao era importado em biblioteca/views.py
        response = self.client.get(reverse('lista_autores'))
        self.assertEqual(response.status_code, 200)

    def test_css_base_do_template_e_descoberto_pelos_finders(self):
        # O arquivo-fonte vive em STATICFILES_DIRS. staticfiles_storage.exists
        # consulta STATIC_ROOT, que só é preenchido após collectstatic e por
        # isso não representa a disponibilidade do asset em desenvolvimento.
        self.assertIsNotNone(finders.find('css/styles.css'))


class SegurancaCatalogoTests(TestCase):
    def setUp(self):
        self.categoria = Categoria.objects.create(nome='Teste')

    def test_usuario_comum_nao_pode_escrever_diretamente_no_catalogo(self):
        user = User.objects.create_user(username='leitor', password='x')
        client = APIClient()
        client.force_authenticate(user)
        response = client.post(
            '/api/v1/biblioteca/livros/',
            {'titulo': 'Injetado', 'autor': 'Cliente', 'categoria': self.categoria.pk},
            format='json',
        )
        self.assertEqual(response.status_code, 403)

    def test_rejeita_arquivo_disfarcado_de_pdf(self):
        arquivo = SimpleUploadedFile('obra.pdf', b'conteudo executavel', content_type='application/pdf')
        serializer = SolicitacaoPublicacaoSerializer(data={
            'titulo': 'Obra',
            'categoria': self.categoria.pk,
            'pdf': arquivo,
            'cpf_autor': '12345678909',
            'declaracao_autoria': True,
            'aceitou_termos': True,
        })
        self.assertFalse(serializer.is_valid())
        self.assertIn('pdf', serializer.errors)

    def test_consultar_lixeira_nao_exclui_livro(self):
        admin = User.objects.create_superuser(username='admin-lixeira', password='x')
        livro = Livro.objects.create(
            titulo='Preservado', autor='Autor', categoria=self.categoria, status='removido'
        )
        client = APIClient()
        client.force_authenticate(admin)
        response = client.get('/api/v1/dashboard/lixeira/')
        self.assertEqual(response.status_code, 200)
        self.assertTrue(Livro.objects.filter(pk=livro.pk).exists())
