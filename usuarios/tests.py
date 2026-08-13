from django.contrib.auth.models import User
from django.test import TestCase

from usuarios.models import Usuario
from usuarios.services import obter_ou_criar_usuario_customizado
from rest_framework.test import APIClient


class ObterOuCriarUsuarioCustomizadoTests(TestCase):
    # Regressao: essa logica estava triplicada (e inconsistente entre as
    # copias) em usuarios/api/views.py, perfis/views.py e perfis/api/views.py.

    def test_cria_usuario_leitor_para_user_comum_sem_registro(self):
        user = User.objects.create_user(username='sem-registro', password='x')
        usuario = obter_ou_criar_usuario_customizado(user)
        self.assertEqual(usuario.tipo, 'leitor')
        self.assertEqual(Usuario.objects.filter(user_auth=user).count(), 1)

    def test_cria_usuario_admin_para_superuser_sem_registro(self):
        admin = User.objects.create_superuser(username='root-admin', email='a@a.com', password='x')
        usuario = obter_ou_criar_usuario_customizado(admin)
        self.assertEqual(usuario.tipo, 'admin')

    def test_retorna_registro_existente_sem_duplicar(self):
        user = User.objects.create_user(username='ja-existe', password='x')
        primeira = obter_ou_criar_usuario_customizado(user)
        segunda = obter_ou_criar_usuario_customizado(user)
        self.assertEqual(primeira.pk, segunda.pk)
        self.assertEqual(Usuario.objects.filter(user_auth=user).count(), 1)


class CookieAuthenticationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='cookie-user', password='SenhaForte123!')
        self.client = APIClient(enforce_csrf_checks=True)

    def test_login_exige_csrf_e_nao_expoe_tokens_no_json(self):
        sem_csrf = self.client.post(
            '/api/v1/auth/login/',
            {'username': self.user.username, 'password': 'SenhaForte123!'},
            format='json',
        )
        self.assertEqual(sem_csrf.status_code, 403)

        csrf = self.client.get('/api/v1/auth/csrf/').data['csrfToken']
        response = self.client.post(
            '/api/v1/auth/login/',
            {'username': self.user.username, 'password': 'SenhaForte123!'},
            format='json',
            HTTP_X_CSRFTOKEN=csrf,
        )
        self.assertEqual(response.status_code, 200)
        self.assertNotIn('access', response.data)
        self.assertNotIn('refresh', response.data)
        self.assertTrue(response.cookies['parabook_access']['httponly'])
        self.assertTrue(response.cookies['parabook_refresh']['httponly'])

        sem_csrf_mutavel = self.client.post(
            '/api/v1/auth/alterar-senha/',
            {'senha_antiga': 'SenhaForte123!', 'nova_senha': 'NovaSenhaForte123!'},
            format='json',
        )
        self.assertEqual(sem_csrf_mutavel.status_code, 403)
