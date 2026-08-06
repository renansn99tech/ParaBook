from django.contrib.auth.models import User
from django.test import TestCase

from usuarios.models import Usuario
from usuarios.services import obter_ou_criar_usuario_customizado


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
