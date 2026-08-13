from unittest.mock import patch

from django.test import TestCase, override_settings

from assinaturas.models import EventoStripeProcessado

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
