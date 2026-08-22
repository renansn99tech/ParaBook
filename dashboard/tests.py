from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from usuarios.models import Usuario, AuditoriaAcao


class DashboardLixeiraAPIViewTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin-dash', password='x', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_get_lixeira_nao_gera_nameerror(self):
        # Regressao: timezone/timedelta nao eram importados em dashboard/api/views.py
        response = self.client.get(reverse('api-dashboard-lixeira'))
        self.assertEqual(response.status_code, 200)


class DashboardEstatisticasAPIViewTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin-stats', password='x', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_retorna_metricas_do_painel_de_perfil_admin(self):
        response = self.client.get(reverse('api-dashboard-estatisticas'))

        self.assertEqual(response.status_code, 200)
        self.assertIn('obras_publicadas', response.data['estatisticas'])
        self.assertIn('aprovacoes_pendentes', response.data['estatisticas'])
        self.assertIn('denuncias_abertas', response.data['estatisticas'])
        self.assertIn('novos_usuarios_hoje', response.data['estatisticas'])

    def test_leitor_nao_acessa_metricas_administrativas(self):
        leitor = User.objects.create_user(username='leitor-sem-staff', password='x')
        self.client.force_authenticate(user=leitor)

        response = self.client.get(reverse('api-dashboard-estatisticas'))

        self.assertEqual(response.status_code, 403)


class DashboardModeracaoAPIViewTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin-moderacao', password='x', is_staff=True)
        self.autor = User.objects.create_user(username='autor-pendente', password='x')
        self.usuario = Usuario.objects.create(
            user_auth=self.autor,
            nome='Autor Pendente',
            tipo='aguardando_aprovacao',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def test_aprova_autor_e_registra_auditoria(self):
        response = self.client.post(
            reverse('api-dashboard-moderacao', args=['autor', self.usuario.pk]),
            {'acao': 'aprovar'},
            format='json',
        )
        self.usuario.refresh_from_db()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(self.usuario.tipo, 'autor')
        self.assertTrue(AuditoriaAcao.objects.filter(acao='moderacao.autor.aprovar').exists())

    def test_decisao_duplicada_e_barrada(self):
        url = reverse('api-dashboard-moderacao', args=['autor', self.usuario.pk])
        self.assertEqual(self.client.post(url, {'acao': 'recusar'}, format='json').status_code, 200)
        self.assertEqual(self.client.post(url, {'acao': 'aprovar'}, format='json').status_code, 409)

    def test_leitor_nao_pode_moderar(self):
        self.client.force_authenticate(self.autor)
        response = self.client.post(
            reverse('api-dashboard-moderacao', args=['autor', self.usuario.pk]),
            {'acao': 'aprovar'},
            format='json',
        )
        self.assertEqual(response.status_code, 403)
