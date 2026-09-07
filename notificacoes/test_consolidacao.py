import importlib
from datetime import timedelta
from types import SimpleNamespace

from django.apps import apps as django_apps
from django.contrib.auth.models import User
from django.db import connection
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase
from django.test import TransactionTestCase

from notificacoes.models import Notificacao, NotificacaoLegadaMigracao
from usuarios.models import Notificacao as NotificacaoLegada


class ConsolidacaoNotificacaoMigrationTests(TransactionTestCase):
    reset_sequences = True

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.migration = importlib.import_module(
            'notificacoes.migrations.0004_consolidar_notificacoes_legadas'
        )
        cls.schema_editor = SimpleNamespace(connection=connection)

    def criar_notificacao_legada(self, usuario, **dados):
        notificacao = NotificacaoLegada(usuario_id=usuario.pk, **dados)
        NotificacaoLegada.objects.bulk_create([notificacao])
        return NotificacaoLegada.objects.get(pk=notificacao.pk)

    def test_migracao_preserva_contrato_data_tipo_e_impede_repeticao(self):
        usuario = User.objects.create_user(username='notificacao-migrada')
        data_original = timezone.now() - timedelta(days=30)
        segura = self.criar_notificacao_legada(
            usuario,
            titulo='Novo livro',
            mensagem='Uma obra foi publicada.',
            tipo='LIVRO',
            link_destino='/biblioteca/42?origem=notificacao',
            lida=False,
        )
        NotificacaoLegada.objects.filter(pk=segura.pk).update(data_criacao=data_original)
        segura.refresh_from_db()
        insegura = self.criar_notificacao_legada(
            usuario,
            titulo='Link externo',
            mensagem='Destino não permitido.',
            tipo='SISTEMA',
            link_destino='javascript:alert(1)',
            lida=True,
        )

        self.migration.migrar_notificacoes_legadas(django_apps, self.schema_editor)
        self.migration.migrar_notificacoes_legadas(django_apps, self.schema_editor)

        importada = Notificacao.objects.get(
            migracao_legada_usuarios__legado_id=segura.pk
        )
        rejeitada = NotificacaoLegadaMigracao.objects.get(legado_id=insegura.pk)
        self.assertEqual(importada.tipo, 'LIVRO')
        self.assertEqual(importada.link, '/biblioteca/42?origem=notificacao')
        self.assertEqual(importada.data_criacao, data_original)
        self.assertTrue(rejeitada.link_rejeitado)
        self.assertIsNone(rejeitada.notificacao.link)
        self.assertEqual(NotificacaoLegadaMigracao.objects.count(), 2)
        self.assertEqual(Notificacao.objects.count(), 2)

    def test_reversao_remove_copia_inalterada_e_preserva_editada(self):
        usuario = User.objects.create_user(username='notificacao-reversa')
        inalterada = self.criar_notificacao_legada(
            usuario,
            titulo='Inalterada',
            mensagem='Será removida na reversão.',
            tipo='SISTEMA',
        )
        editada = self.criar_notificacao_legada(
            usuario,
            titulo='Editada',
            mensagem='Será preservada na reversão.',
            tipo='ASSINATURA',
        )
        self.migration.migrar_notificacoes_legadas(django_apps, self.schema_editor)

        notificacao_editada = Notificacao.objects.get(
            migracao_legada_usuarios__legado_id=editada.pk
        )
        notificacao_editada.lida = True
        notificacao_editada.save(update_fields=['lida'])
        self.migration.reverter_notificacoes_legadas(django_apps, self.schema_editor)

        self.assertFalse(
            Notificacao.objects.filter(
                titulo='Inalterada', usuario=usuario
            ).exists()
        )
        self.assertTrue(Notificacao.objects.filter(pk=notificacao_editada.pk).exists())
        self.assertTrue(NotificacaoLegada.objects.filter(pk=inalterada.pk).exists())
        self.assertEqual(NotificacaoLegadaMigracao.objects.count(), 0)

    def test_modelo_legado_bloqueia_novas_gravacoes_pela_aplicacao(self):
        usuario = User.objects.create_user(username='notificacao-read-only')
        with self.assertRaises(RuntimeError):
            NotificacaoLegada.objects.create(
                usuario=usuario,
                titulo='Bloqueada',
                mensagem='Não deve ser gravada.',
            )


class NotificacaoRBACContratoAPITests(APITestCase):
    def setUp(self):
        self.usuario = User.objects.create_user(username='dono', password='senha-forte')
        self.outro = User.objects.create_user(username='outro', password='senha-forte')
        self.propria = Notificacao.objects.create(
            usuario=self.usuario,
            titulo='Própria',
            mensagem='Visível apenas ao dono.',
            tipo='LIVRO',
            link='/biblioteca/1',
        )
        self.alheia = Notificacao.objects.create(
            usuario=self.outro,
            titulo='Alheia',
            mensagem='Não pode vazar.',
        )

    def test_lista_mantem_contrato_e_isola_notificacoes_por_usuario(self):
        self.client.force_authenticate(self.usuario)
        resposta = self.client.get(reverse('notificacao-list'))

        self.assertEqual(resposta.status_code, 200)
        self.assertEqual(len(resposta.data), 1)
        self.assertEqual(
            set(resposta.data[0]),
            {'id', 'titulo', 'mensagem', 'tipo', 'tipo_display', 'link', 'lida', 'data_criacao'},
        )
        self.assertEqual(resposta.data[0]['id'], self.propria.pk)
        self.assertEqual(resposta.data[0]['tipo'], 'LIVRO')

    def test_usuario_nao_pode_ler_nem_marcar_notificacao_alheia(self):
        self.client.force_authenticate(self.usuario)
        detalhe = self.client.get(reverse('notificacao-detail', args=[self.alheia.pk]))
        marcar = self.client.post(reverse('notificacao-lida', args=[self.alheia.pk]))

        self.assertEqual(detalhe.status_code, 404)
        self.assertEqual(marcar.status_code, 404)
        self.alheia.refresh_from_db()
        self.assertFalse(self.alheia.lida)
