from django.contrib.auth.models import User
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient


class DashboardLixeiraAPIViewTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(username='admin-dash', password='x', is_staff=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.admin)

    def test_get_lixeira_nao_gera_nameerror(self):
        # Regressao: timezone/timedelta nao eram importados em dashboard/api/views.py
        response = self.client.get(reverse('api-dashboard-lixeira'))
        self.assertEqual(response.status_code, 200)
