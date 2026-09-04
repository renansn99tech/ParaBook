from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase


User = get_user_model()


class SeedAdminCommandTests(TestCase):
    @patch.dict('os.environ', {}, clear=True)
    def test_exige_todas_as_credenciais_por_variavel_de_ambiente(self):
        with self.assertRaises(CommandError):
            call_command('seed_admin')

        self.assertFalse(User.objects.exists())

    @patch.dict(
        'os.environ',
        {
            'SEED_ADMIN_USERNAME': 'admin-seguro',
            'SEED_ADMIN_EMAIL': 'admin@parabook.test',
            'SEED_ADMIN_PASSWORD': 'Uma-Senha-de-Teste-8392!',
        },
        clear=True,
    )
    def test_cria_superusuario_sem_credenciais_padrao(self):
        call_command('seed_admin')

        user = User.objects.get(username='admin-seguro')
        self.assertTrue(user.is_staff)
        self.assertTrue(user.is_superuser)
        self.assertTrue(user.check_password('Uma-Senha-de-Teste-8392!'))
