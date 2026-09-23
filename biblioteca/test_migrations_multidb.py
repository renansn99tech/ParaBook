from importlib import import_module
from types import SimpleNamespace
from unittest.mock import Mock

from django.test import SimpleTestCase


class MigrationDatabaseAliasTests(SimpleTestCase):
    def setUp(self):
        self.model = SimpleNamespace(objects=Mock())
        self.apps = Mock()
        self.apps.get_model.return_value = self.model
        self.schema_editor = SimpleNamespace(
            connection=SimpleNamespace(alias='migration')
        )

    def test_categoria_infantis_usa_conexao_da_migration(self):
        migration = import_module(
            'biblioteca.migrations.0012_categoria_disponibilidade_publica'
        )

        migration.ocultar_categoria_infantis(self.apps, self.schema_editor)

        self.model.objects.using.assert_called_once_with('migration')
        self.model.objects.using.return_value.filter.assert_called_once_with(
            nome__iexact='Infantis'
        )

    def test_campos_legados_do_perfil_usam_conexao_da_migration(self):
        migration = import_module(
            'perfis.migrations.0009_privacidade_aniversario_sem_ano'
        )

        migration.tornar_campos_legados_privados(self.apps, self.schema_editor)

        self.assertEqual(self.model.objects.using.call_count, 2)
        self.model.objects.using.assert_any_call('migration')
        self.assertEqual(
            self.model.objects.using.return_value.filter.call_count, 2
        )
