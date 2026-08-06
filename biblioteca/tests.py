from django.test import TestCase
from django.urls import reverse


class ListaAutoresViewTests(TestCase):
    def test_lista_autores_nao_gera_nameerror(self):
        # Regressao: Usuario nao era importado em biblioteca/views.py
        response = self.client.get(reverse('lista_autores'))
        self.assertEqual(response.status_code, 200)
