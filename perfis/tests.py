from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from usuarios.models import Usuario


class AutoresListAPIViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='leitor-teste', password='x')
        autor_auth = User.objects.create_user(username='autor-teste', password='x')
        Usuario.objects.create(user_auth=autor_auth, nome='Autor Teste', tipo='autor')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_get_autores_nao_gera_nameerror(self):
        # Regressao: Livro nao era importado em perfis/api/views.py. So dispara
        # dentro do loop, por isso o setUp precisa de 1 Usuario tipo='autor'.
        response = self.client.get(reverse('api-autores'))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
