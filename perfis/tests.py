import tempfile
from io import BytesIO

from django.contrib.auth.models import User
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.urls import reverse
from PIL import Image
from rest_framework.test import APIClient

from perfis.models import Perfil
from usuarios.models import Usuario


def _imagem_png():
    """Gera um PNG 1x1 válido para o ImageField aceitar (Pillow valida o conteúdo)."""
    buffer = BytesIO()
    Image.new('RGB', (1, 1), '#8B5CF6').save(buffer, format='PNG')
    buffer.seek(0)
    return SimpleUploadedFile('avatar.png', buffer.read(), content_type='image/png')


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


# Isola os uploads num diretorio temporario para nao sujar o media/ do repo.
@override_settings(MEDIA_ROOT=tempfile.mkdtemp())
class FotoPerfilAPITests(TestCase):
    # Contrato que os botoes de foto do Profile.jsx consomem: trocar (upload
    # multipart) e remover (foto=null volta para o avatar padrao).

    def setUp(self):
        self.user = User.objects.create_user(username='foto-user', password='x')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)
        self.url = reverse('api-meu-perfil')

    def test_upload_multipart_define_a_foto(self):
        resposta = self.client.patch(self.url, {'foto': _imagem_png()}, format='multipart')
        self.assertEqual(resposta.status_code, 200)
        perfil = Perfil.objects.get(usuario=self.user)
        self.assertTrue(perfil.foto)

    def test_foto_null_limpa_a_foto(self):
        self.client.patch(self.url, {'foto': _imagem_png()}, format='multipart')
        perfil = Perfil.objects.get(usuario=self.user)
        self.assertTrue(perfil.foto)  # sanidade: havia foto antes de remover

        resposta = self.client.patch(self.url, {'foto': None}, format='json')
        self.assertEqual(resposta.status_code, 200)

        perfil.refresh_from_db()
        self.assertFalse(perfil.foto)
