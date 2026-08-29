from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from gamificacao.models import Conquista, ConquistaUsuario, ProgressoLeitor
from usuarios.models import Usuario


class MeusStatsAPIViewTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='leitora-stats', password='x')
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_retorna_progresso_do_nivel_e_total_de_conquistas(self):
        progresso = ProgressoLeitor.objects.get(user=self.user)
        progresso.pontos_xp = 150
        progresso.nivel = 2
        progresso.dias_seguidos = 4
        progresso.save(update_fields=['pontos_xp', 'nivel', 'dias_seguidos'])
        conquista = Conquista.objects.create(
            slug='teste-perfil',
            nome='Teste do perfil',
            descricao='Conquista usada no contrato do perfil.',
        )
        ConquistaUsuario.objects.create(user=self.user, conquista=conquista)

        response = self.client.get(reverse('api-meus-stats'))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['xp_no_nivel'], 50)
        self.assertEqual(response.data['xp_necessario_nivel'], 200)
        self.assertEqual(response.data['progresso_nivel'], 0.25)
        self.assertEqual(response.data['total_conquistas'], 1)


class RankingIdentidadeAdministrativaTests(TestCase):
    def setUp(self):
        self.leitor = User.objects.create_user(username='ranking-leitor', password='x')
        Usuario.objects.create(user_auth=self.leitor, nome='Leitor Ranking', tipo='leitor')
        self.admin = User.objects.create_user(
            username='ranking-admin-real', password='x', is_staff=True,
        )
        Usuario.objects.create(user_auth=self.admin, nome='Admin Real', tipo='admin')
        ProgressoLeitor.objects.get_or_create(user=self.leitor)
        progresso_admin, _ = ProgressoLeitor.objects.get_or_create(user=self.admin)
        progresso_admin.pontos_xp = 100
        progresso_admin.save(update_fields=['pontos_xp'])
        self.client = APIClient()

    def test_leitor_ve_admin_generico_no_ranking(self):
        self.client.force_authenticate(self.leitor)
        resposta = self.client.get(reverse('api-ranking'))

        linha = next(item for item in resposta.data['ranking'] if item['user_id'] == self.admin.id)
        self.assertEqual(linha['username'], 'admin')
        self.assertEqual(linha['nome_exibicao'], 'Admin ParaBook')
        self.assertFalse(linha['perfil_clicavel'])

    def test_admin_ve_a_propria_identidade_real_no_ranking(self):
        self.client.force_authenticate(self.admin)
        resposta = self.client.get(reverse('api-ranking'))

        linha = next(item for item in resposta.data['ranking'] if item['user_id'] == self.admin.id)
        self.assertEqual(linha['username'], self.admin.username)
        self.assertTrue(linha['perfil_clicavel'])
