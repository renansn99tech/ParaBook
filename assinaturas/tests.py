from unittest.mock import patch
from types import SimpleNamespace

from django.contrib.auth.models import User
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from assinaturas.models import Assinatura, EventoStripeProcessado, Plano
from assinaturas.utils import usuario_eh_premium

@override_settings(STRIPE_SECRET_KEY='sk_test', STRIPE_WEBHOOK_SECRET='whsec_test')
class StripeWebhookTests(TestCase):
    @patch('assinaturas.webhooks.stripe.Webhook.construct_event')
    def test_evento_repetido_e_processado_uma_unica_vez(self, construct_event):
        construct_event.return_value = {
            'id': 'evt_unico',
            'type': 'evento.nao_mapeado',
            'data': {'object': {}},
        }
        primeira = self.client.post('/assinaturas/webhook/', data=b'{}', content_type='application/json')
        segunda = self.client.post('/assinaturas/webhook/', data=b'{}', content_type='application/json')
        self.assertEqual(primeira.status_code, 200)
        self.assertEqual(segunda.status_code, 200)
        self.assertEqual(EventoStripeProcessado.objects.filter(evento_id='evt_unico').count(), 1)


@override_settings(STRIPE_SECRET_KEY='sk_test', FRONTEND_URL='https://app.parabook.test')
class CheckoutAPITests(TestCase):
    def setUp(self):
        self.usuario = User.objects.create_user(username='checkout', password='x')
        self.client = APIClient()
        self.client.force_authenticate(self.usuario)

    def test_plano_gratuito_e_ativado_sem_conceder_premium(self):
        plano = Plano.objects.create(nome='Gratuito', preco='0.00', limite_livros=10, anuncios=True)

        resposta = self.client.post('/api/v1/assinaturas/checkout/', {'plano_id': plano.pk}, format='json')

        assinatura = Assinatura.objects.get(usuario=self.usuario)
        self.assertEqual(resposta.status_code, 200)
        self.assertTrue(assinatura.ativa)
        self.assertEqual(assinatura.plano, plano)
        self.assertFalse(usuario_eh_premium(self.usuario))

    @patch('assinaturas.api.views.stripe.checkout.Session.create')
    def test_checkout_pago_usa_urls_e_metadados_definidos_no_servidor(self, criar_sessao):
        criar_sessao.return_value = SimpleNamespace(url='https://checkout.stripe.test/session')
        plano = Plano.objects.create(
            nome='Premium', preco='19.90', limite_livros=0, anuncios=False,
            stripe_price_id='price_premium',
        )

        resposta = self.client.post('/api/v1/assinaturas/checkout/', {
            'plano_id': plano.pk,
            'return_url': 'https://site-malicioso.test',
        }, format='json')

        self.assertEqual(resposta.status_code, 201)
        self.assertEqual(resposta.data['url'], 'https://checkout.stripe.test/session')
        argumentos = criar_sessao.call_args.kwargs
        self.assertEqual(argumentos['success_url'], 'https://app.parabook.test/minha-assinatura?sucesso=true')
        self.assertEqual(argumentos['cancel_url'], 'https://app.parabook.test/planos?cancelado=true')
        self.assertEqual(argumentos['metadata']['plano_id'], str(plano.pk))
