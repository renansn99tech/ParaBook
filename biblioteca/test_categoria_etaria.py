from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework.test import APIClient
from django.test import TestCase

from biblioteca.models import Categoria, Livro
from usuarios.models import Usuario


class CategoriaEtariaAPITests(TestCase):
    def setUp(self):
        self.infantis = Categoria.objects.create(
            nome='Infantis', disponivel_publicamente=False,
        )
        self.publica = Categoria.objects.create(nome='Fantasia')
        self.livro_infantil = Livro.objects.create(
            titulo='Obra preservada', autor='Autora', categoria=self.infantis,
        )
        Livro.objects.create(titulo='Obra pública', autor='Autor', categoria=self.publica)
        self.client = APIClient()

    def test_categoria_e_obras_infantis_sao_preservadas_mas_nao_publicas(self):
        categorias = self.client.get(reverse('categoria-list'))
        livros = self.client.get(reverse('livro-list'))

        self.assertEqual(categorias.status_code, 200)
        self.assertEqual(livros.status_code, 200)
        self.assertNotIn(self.infantis.id, [item['id'] for item in categorias.data])
        self.assertNotIn(self.livro_infantil.id, [item['id'] for item in livros.data])
        self.assertTrue(Livro.objects.filter(pk=self.livro_infantil.pk).exists())

    def test_dashboard_nao_pode_criar_obra_nova_em_categoria_indisponivel(self):
        admin = User.objects.create_superuser(username='admin-categoria', password='x')
        Usuario.objects.create(user_auth=admin, nome='Admin', tipo='admin')
        self.client.force_authenticate(user=admin)

        resposta = self.client.post(reverse('livro-list'), {
            'titulo': 'Nova obra infantil',
            'autor': 'Admin',
            'categoria': self.infantis.id,
            'origem': 'dominio_publico',
        }, format='json')

        self.assertEqual(resposta.status_code, 400)
        self.assertIn('categoria', resposta.data)
