from importlib import import_module
from types import SimpleNamespace

from django.contrib.auth.models import User
from django.db import connection, transaction, DatabaseError
from django.test import TestCase
from django.utils import timezone

from usuarios.models import EncerramentoConta
from usuarios.retencao import limite_retencao


class PrivacidadeRlsTests(TestCase):
    def setUp(self):
        # O ensaio exige o proprietário do PostgreSQL local sintético. Nenhuma
        # credencial de runtime/produção é usada nem impressa aqui.
        self.assertIn(connection.settings_dict['HOST'], {'localhost', '127.0.0.1'})
        self.assertTrue(connection.settings_dict['NAME'].startswith('test_'))
        with connection.cursor() as cursor:
            cursor.execute('CREATE ROLE g5_s019_leitura NOLOGIN')
            cursor.execute('CREATE ROLE parabook_runtime NOLOGIN')
        migration = import_module('usuarios.migrations.0012_privacidade_rls')
        editor = SimpleNamespace(connection=connection)
        migration.restringir_tabelas(None, editor)
        migration.restringir_tabelas(None, editor)
        user = User.objects.create_user(username='dado-rls-sintetico')
        agora = timezone.now()
        EncerramentoConta.objects.create(usuario=user, conta_id_original=user.pk, conta_criada_em=user.date_joined,
            encerrada_em=agora, descarte_ate=limite_retencao('R01', agora), prova_ate=limite_retencao('R08', agora))

    def test_leitura_direta_com_grant_ainda_e_bloqueada_por_rls(self):
        with connection.cursor() as cursor:
            cursor.execute('GRANT SELECT ON usuarios_encerramentoconta TO g5_s019_leitura')
            cursor.execute('SET LOCAL ROLE g5_s019_leitura')
            try:
                cursor.execute('SELECT count(*) FROM usuarios_encerramentoconta')
                self.assertEqual(cursor.fetchone()[0], 0)
            finally:
                cursor.execute('RESET ROLE')

    def test_runtime_tem_leitura_mas_nao_purga_provas_nem_altera_cipher(self):
        with connection.cursor() as cursor:
            cursor.execute('SET LOCAL ROLE parabook_runtime')
            cursor.execute('SELECT count(*) FROM usuarios_encerramentoconta')
            self.assertEqual(cursor.fetchone()[0], 1)
            cursor.execute("SELECT has_table_privilege(current_user, 'usuarios_provaprivacidade', 'DELETE'), "
                           "has_column_privilege(current_user, 'usuarios_provaprivacidade', 'conteudo_cifrado', 'UPDATE')")
            self.assertEqual(cursor.fetchone(), (False, False))
            cursor.execute('RESET ROLE')
        with self.assertRaises(DatabaseError):
            with transaction.atomic():
                with connection.cursor() as cursor:
                    cursor.execute('SET LOCAL ROLE parabook_runtime')
                    cursor.execute('DELETE FROM usuarios_provaprivacidade')
