import os
from datetime import datetime, timezone
import stripe
from django.conf import settings
from django.db import IntegrityError, transaction
from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from .models import Plano, Assinatura, EventoStripeProcessado
from notificacoes.models import Notificacao

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
    Endpoint isento de CSRF que recebe eventos assíncronos enviados pela Stripe
    e registra notificações para o usuário.
    """
    if not settings.PAYMENTS_ENABLED:
        return HttpResponse(status=503)

    stripe_key = getattr(settings, 'STRIPE_SECRET_KEY', None) or os.getenv('STRIPE_SECRET_KEY')
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', None) or os.getenv('STRIPE_WEBHOOK_SECRET')

    if not stripe_key or not webhook_secret:
        return HttpResponse(status=503)
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
    event_id = _get_val(event, 'id')
    if not event_id or not event_type:
        return HttpResponse(status=400)

    with transaction.atomic():
        try:
            with transaction.atomic():
                EventoStripeProcessado.objects.create(evento_id=event_id, tipo=event_type)
        except IntegrityError:
            return HttpResponse(status=200)

        response = _processar_evento(
            event_type,
            _get_val(_get_val(event, 'data'), 'object'),
        )
        if response.status_code >= 400:
            transaction.set_rollback(True)
        return response


def _processar_evento(event_type, data_obj):

    # 1. EVENTO: Fatura Paga (Renovação ou Pagamento de Assinatura)
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
                return HttpResponse(status=502)

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

                # Criar Notificação de Confirmação de Fatura/Renovação
                Notificacao.objects.create(
                    usuario=usuario,
                    titulo="Pagamento Confirmado! 🎉",
                    mensagem=f"Seu pagamento do plano {plano.nome} foi processado com sucesso. Aproveite a leitura!",
                    tipo='ASSINATURA',
                    link="/assinaturas/minha-assinatura/"
                )

            except (User.DoesNotExist, Plano.DoesNotExist):
                return HttpResponse(status=404)

    # 2. EVENTO: Checkout Concluído (Primeira Assinatura)
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

                # Criar Notificação de Boas-Vindas ao Plano
                Notificacao.objects.create(
                    usuario=usuario,
                    titulo="Assinatura Ativada! ✨",
                    mensagem=f"Parabéns! Sua assinatura do plano {plano.nome} foi ativada com sucesso.",
                    tipo='ASSINATURA',
                    link="/assinaturas/minha-assinatura/"
                )

            except (User.DoesNotExist, Plano.DoesNotExist):
                return HttpResponse(status=404)

    # 3. EVENTOS DE CANCELAMENTO / INADIMPLÊNCIA / ALTERAÇÃO
    elif event_type in ['customer.subscription.deleted', 'customer.subscription.updated']:
        stripe_sub_id = _get_val(data_obj, 'id')
        status = _get_val(data_obj, 'status')

        if status in ['canceled', 'unpaid', 'incomplete_expired']:
            assinaturas = Assinatura.objects.filter(stripe_subscription_id=stripe_sub_id)
            for assinatura in assinaturas:
                assinatura.ativa = False
                assinatura.save()

                # Criar Notificação de Alerta sobre o Cancelamento/Falha
                Notificacao.objects.create(
                    usuario=assinatura.usuario,
                    titulo="Alerta de Assinatura ⚠️",
                    mensagem="Sua assinatura foi cancelada ou identificamos uma falha no pagamento. Atualize suas informações para manter o acesso Premium.",
                    tipo='ASSINATURA',
                    link="/assinaturas/minha-assinatura/"
                )

    return HttpResponse(status=200)
