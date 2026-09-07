import importlib
from types import SimpleNamespace

from django.apps import apps as django_apps
from django.contrib.auth.models import User
from django.db import connection
from django.test import TransactionTestCase

from biblioteca.models import Perfil as PerfilLegado
from perfis.models import Perfil, PerfilLegadoMigracao


class ConsolidacaoPerfilMigrationTests(TransactionTestCase):
    reset_sequences = True

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.migration = importlib.import_module(
            'perfis.migrations.0008_consolidar_perfis_legados'
        )
        cls.schema_editor = SimpleNamespace(connection=connection)

    def criar_perfil_legado(self, usuario, **dados):
        perfil = PerfilLegado(user_id=usuario.pk, **dados)
        PerfilLegado.objects.bulk_create([perfil])
        return PerfilLegado.objects.get(user_id=usuario.pk)

    def test_migracao_conservadora_registra_conflito_e_e_idempotente(self):
        usuario = User.objects.create_user(username='perfil-conflito')
        canonico = Perfil.objects.create(
            usuario=usuario,
            bio='Bio canônica',
            localizacao=None,
        )
        legado = self.criar_perfil_legado(
            usuario,
            bio='Bio legada divergente',
            localizacao='Belém',
            status='perfil_aprovado',
        )

        self.migration.migrar_perfis_legados(django_apps, self.schema_editor)
        self.migration.migrar_perfis_legados(django_apps, self.schema_editor)

        canonico.refresh_from_db()
        proveniencia = PerfilLegadoMigracao.objects.get(legado_id=legado.pk)
        self.assertEqual(canonico.bio, 'Bio canônica')
        self.assertEqual(canonico.localizacao, 'Belém')
        self.assertEqual(proveniencia.conflitos, ['bio'])
        self.assertEqual(proveniencia.campos_preenchidos, ['localizacao'])
        self.assertEqual(proveniencia.status_legado, 'perfil_aprovado')
        self.assertEqual(PerfilLegadoMigracao.objects.count(), 1)

        self.migration.reverter_perfis_legados(django_apps, self.schema_editor)
        canonico.refresh_from_db()
        self.assertEqual(canonico.bio, 'Bio canônica')
        self.assertIsNone(canonico.localizacao)
        self.assertTrue(PerfilLegado.objects.filter(pk=legado.pk).exists())

    def test_reversao_remove_apenas_perfil_criado_e_inalterado(self):
        usuario = User.objects.create_user(username='perfil-novo')
        legado = self.criar_perfil_legado(usuario, bio='Bio importada')
        orfao = Perfil.objects.create(usuario=None, bio='Perfil órfão preservado')

        self.migration.migrar_perfis_legados(django_apps, self.schema_editor)
        criado = Perfil.objects.get(usuario=usuario)
        proveniencia = PerfilLegadoMigracao.objects.get(perfil=criado)
        self.assertEqual(criado.bio, 'Bio importada')
        self.assertTrue(proveniencia.perfil_criado)
        self.assertEqual(
            self.migration._snapshot_hash(criado),
            proveniencia.snapshot_pos_migracao_hash,
        )

        self.migration.reverter_perfis_legados(django_apps, self.schema_editor)
        self.assertFalse(Perfil.objects.filter(usuario=usuario).exists())
        self.assertTrue(Perfil.objects.filter(pk=orfao.pk).exists())
        self.assertTrue(PerfilLegado.objects.filter(pk=legado.pk).exists())

    def test_reversao_preserva_perfil_criado_mas_editado_depois(self):
        usuario = User.objects.create_user(username='perfil-editado')
        self.criar_perfil_legado(usuario, bio='Bio importada')
        self.migration.migrar_perfis_legados(django_apps, self.schema_editor)

        perfil = Perfil.objects.get(usuario=usuario)
        perfil.bio = 'Bio editada depois da migração'
        perfil.save(update_fields=['bio'])
        self.migration.reverter_perfis_legados(django_apps, self.schema_editor)

        perfil.refresh_from_db()
        self.assertEqual(perfil.bio, 'Bio editada depois da migração')

    def test_modelo_legado_bloqueia_novas_gravacoes_pela_aplicacao(self):
        usuario = User.objects.create_user(username='perfil-read-only')
        with self.assertRaises(RuntimeError):
            PerfilLegado.objects.create(user=usuario)
