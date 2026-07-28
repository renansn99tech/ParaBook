import os
from datetime import datetime, timezone
import stripe
from django.conf import settings
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from .models import Plano, Assinatura

User = get_user_model()


def _get_val(obj, key, default=None):
    """
    Função auxiliar segura para extrair valores tanto de dicionários
    quanto de objetos internos SDK da Stripe sem lançar exceção.
    """
    if obj is None:
        return default
    if isinstance(obj, dict):
        return obj.get(key, default)
    return getattr(obj, key, default)


@csrf_exempt
def stripe_webhook(request):
    """
    Endpoint isento de CSRF que recebe eventos assíncronos enviados pela Stripe.
    """
    stripe_key = getattr(settings, 'STRIPE_SECRET_KEY', None) or os.getenv('STRIPE_SECRET_KEY')
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None) or os.getenv('STRIPE_WEBHOOK_SECRET')

    if stripe_key:
        stripe.api_key = stripe_key

    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)

    event_type = _get_val(event, 'type')
    data_obj = _get_val(_get_val(event, 'data'), 'object')

    # 1. EVENTO: Fatura Paga
    if event_type == 'invoice.paid':
        customer_id = _get_val(data_obj, 'customer')
        subscription_id = _get_val(data_obj, 'subscription')

        user_id = None
        plano_id = None
        data_fim_dt = None

        if subscription_id:
            try:
                subscription = stripe.Subscription.retrieve(subscription_id)
                metadata = _get_val(subscription, 'metadata')
                user_id = _get_val(metadata, 'user_id')
                plano_id = _get_val(metadata, 'plano_id')

                period_end = _get_val(subscription, 'current_period_end')
                if period_end:
                    data_fim_dt = datetime.fromtimestamp(period_end, tz=timezone.utc)
            except Exception:
                pass

        if user_id and plano_id:
            try:
                usuario = User.objects.get(id=user_id)
                plano = Plano.objects.get(id=plano_id)

                assinatura, _ = Assinatura.objects.get_or_create(usuario=usuario)
                assinatura.plano = plano
                assinatura.ativa = True
                assinatura.stripe_customer_id = customer_id
                assinatura.stripe_subscription_id = subscription_id
                if data_fim_dt:
                    assinatura.data_fim = data_fim_dt
                assinatura.save()
            except (User.DoesNotExist, Plano.DoesNotExist):
                return HttpResponse(status=404)

    # 2. EVENTO: Checkout Concluído
    elif event_type == 'checkout.session.completed':
        user_id = _get_val(data_obj, 'client_reference_id')
        customer_id = _get_val(data_obj, 'customer')
        subscription_id = _get_val(data_obj, 'subscription')
        payment_status = _get_val(data_obj, 'payment_status')
        
        metadata = _get_val(data_obj, 'metadata')
        plano_id = _get_val(metadata, 'plano_id')

        if payment_status == 'paid' and user_id and plano_id:
            try:
                usuario = User.objects.get(id=user_id)
                plano = Plano.objects.get(id=plano_id)

                assinatura, _ = Assinatura.objects.get_or_create(usuario=usuario)
                assinatura.plano = plano
                assinatura.ativa = True
                assinatura.stripe_customer_id = customer_id
                assinatura.stripe_subscription_id = subscription_id
                assinatura.save()
            except (User.DoesNotExist, Plano.DoesNotExist):
                return HttpResponse(status=404)

    # 3. EVENTOS DE CANCELAMENTO / INADIMPLÊNCIA
    elif event_type in ['customer.subscription.deleted', 'customer.subscription.updated']:
        stripe_sub_id = _get_val(data_obj, 'id')
        status = _get_val(data_obj, 'status')

        if status in ['canceled', 'unpaid', 'incomplete_expired']:
            Assinatura.objects.filter(stripe_subscription_id=stripe_sub_id).update(ativa=False)

    return HttpResponse(status=200)