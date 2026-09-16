import json
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase

from usuarios.models import Usuario


class CensoIdadeLegadaTests(TestCase):
    def _criar(self, sufixo, valor):
        user = User.objects.create_user(username=f'censo-{sufixo}')
        Usuario.objects.create(user_auth=user, data_nascimento=valor)

    def test_censo_classifica_sem_expor_valores_nem_alterar_registros(self):
        self._criar('iso', '1990-01-30')
        self._criar('barra', '30/01/1990')
        self._criar('invalido', '30 de janeiro')
        self._criar('ausente', None)
        saida = StringIO()

        call_command('censo_idade_legada', stdout=saida)
        resultado = json.loads(saida.getvalue())

        self.assertEqual(resultado['total_contas_com_registro'], 4)
        self.assertEqual(resultado['formatos']['iso'], 1)
        self.assertEqual(resultado['formatos']['dia_mes_ano_barra'], 1)
        self.assertEqual(resultado['formatos']['invalido'], 1)
        self.assertEqual(resultado['formatos']['ausente'], 1)
        self.assertNotIn('1990-01-30', saida.getvalue())
        self.assertEqual(Usuario.objects.get(user_auth__username='censo-iso').data_nascimento, '1990-01-30')
