from django.contrib.auth.models import User
from django.conf import settings
from django.test import TestCase

from usuarios.models import Usuario
from usuarios.api.serializers import RegisterSerializer
from perfis.api.serializers import PerfilSerializer
from perfis.models import Perfil
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


class AceiteTermosVersionadoTests(TestCase):
    def test_cadastro_api_rejeita_aceite_ausente(self):
        serializer = RegisterSerializer(data={
            'username': 'sem-aceite',
            'email': 'sem-aceite@example.com',
            'password': 'SenhaForte123!',
            'termos_aceitos': False,
        })

        self.assertFalse(serializer.is_valid())
        self.assertIn('termos_aceitos', serializer.errors)

    def test_cadastro_registra_versao_vigente(self):
        serializer = RegisterSerializer(data={
            'username': 'com-aceite',
            'email': 'com-aceite@example.com',
            'password': 'SenhaForte123!',
            'termos_aceitos': True,
        })
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        self.assertEqual(
            user.perfil_customizado.versao_termos_aceita,
            settings.TERMS_VERSION,
        )

    def test_novo_aceite_substitui_versao_antiga(self):
        user = User.objects.create_user(username='aceite-antigo', password='x')
        usuario = Usuario.objects.create(
            user_auth=user,
            termos_aceitos=True,
            versao_termos_aceita='versao-antiga',
        )
        self.client.force_login(user)

        response = self.client.post('/api/v1/auth/aceitar-termos/')
        usuario.refresh_from_db()

        self.assertEqual(response.status_code, 200)
        self.assertEqual(usuario.versao_termos_aceita, settings.TERMS_VERSION)

    def test_perfil_trata_versao_antiga_como_aceite_pendente(self):
        user = User.objects.create_user(username='perfil-antigo', password='x')
        perfil = Perfil.objects.create(usuario=user)
        Usuario.objects.create(
            user_auth=user,
            perfil=perfil,
            termos_aceitos=True,
            versao_termos_aceita='versao-antiga',
        )

        self.assertFalse(PerfilSerializer(perfil).data['termos_aceitos'])

    def test_governanca_publica_versao_e_jurisdicao(self):
        response = self.client.get('/api/v1/auth/governanca/')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['versao_termos'], settings.TERMS_VERSION)
        self.assertEqual(response.data['jurisdicao'], 'Brasil')
