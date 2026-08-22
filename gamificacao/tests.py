from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient

from gamificacao.models import Conquista, ConquistaUsuario, ProgressoLeitor


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
