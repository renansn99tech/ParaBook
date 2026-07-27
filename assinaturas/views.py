import os
from datetime import datetime, timezone
import stripe
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from .models import Plano, Assinatura

User = get_user_model()


@login_required
def listar_planos(request):
    planos = Plano.objects.all().order_by('preco')
    return render(request, 'assinaturas/planos.html', {'planos': planos})


@login_required
def minha_assinatura(request):
    """
    Exibe os detalhes da assinatura ativa do usuário logado.
    """
    assinatura = Assinatura.objects.filter(usuario=request.user, ativa=True).first()
    
    context = {
        'assinatura': assinatura,
    }
    return render(request, 'assinaturas/minha_assinatura.html', context)


@login_required
def criar_sessao_checkout(request, plano_id):
    plano = get_object_or_404(Plano, id=plano_id)

    stripe_key = getattr(settings, 'STRIPE_SECRET_KEY', None) or os.getenv('STRIPE_SECRET_KEY')

    if not stripe_key:
        return HttpResponse(
            "Erro de Configuração: STRIPE_SECRET_KEY não foi encontrada.",
            status=500
        )

    stripe.api_key = stripe_key

    checkout_session = stripe.checkout.Session.create(
        line_items=[{
            'price': plano.stripe_price_id,
            'quantity': 1,
        }],
        mode='subscription',
        success_url=request.build_absolute_uri('/assinaturas/minha-assinatura/?sucesso=true'),
        cancel_url=request.build_absolute_uri('/assinaturas/planos/?cancelado=true'),
        client_reference_id=str(request.user.id),
        metadata={
            'plano_id': str(plano.id),
            'user_id': str(request.user.id)
        },
        subscription_data={
            'metadata': {
                'plano_id': str(plano.id),
                'user_id': str(request.user.id)
            }
        }
    )
    return redirect(checkout_session.url, code=303)


@login_required
def criar_sessao_portal(request):
    """
    Gera a sessão do Stripe Customer Portal e redireciona o usuário
    para gerenciar/cancelar sua assinatura de forma autosserviço.
    """
    stripe_key = getattr(settings, 'STRIPE_SECRET_KEY', None) or os.getenv('STRIPE_SECRET_KEY')

    if not stripe_key:
        return HttpResponse("Erro de Configuração com a Stripe.", status=500)

    stripe.api_key = stripe_key

    assinatura = Assinatura.objects.filter(usuario=request.user, ativa=True).first()

    if not assinatura or not assinatura.stripe_customer_id:
        return redirect('assinaturas:listar_planos')

    portal_session = stripe.billing_portal.Session.create(
        customer=assinatura.stripe_customer_id,
        return_url=request.build_absolute_uri('/assinaturas/minha-assinatura/'),
    )

    return redirect(portal_session.url, code=303)


@csrf_exempt
def stripe_webhook(request):
    """
    Endpoint isento de CSRF que recebe eventos assíncronos enviados pela Stripe.
    Trata pagamentos instantâneos e assíncronos (Boleto, Pix, Cartão).
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

    # 1. EVENTO: Fatura Paga (Ativa e grava a data_fim do período pago)
    if event['type'] == 'invoice.paid':
        invoice = event['data']['object']
        customer_id = invoice.get('customer')
        subscription_id = invoice.get('subscription')

        user_id = None
        plano_id = None
        data_fim_dt = None

        if subscription_id:
            try:
                subscription = stripe.Subscription.retrieve(subscription_id)
                user_id = subscription.metadata.get('user_id')
                plano_id = subscription.metadata.get('plano_id')

                # Extrai o timestamp de término do período pago
                period_end = subscription.get('current_period_end')
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
    elif event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        user_id = session.get('client_reference_id')
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        plano_id = session.get('metadata', {}).get('plano_id')

        if session.get('payment_status') == 'paid' and user_id and plano_id:
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
    elif event['type'] in ['customer.subscription.deleted', 'customer.subscription.updated']:
        subscription = event['data']['object']
        stripe_sub_id = subscription.get('id')
        status = subscription.get('status')

        if status in ['canceled', 'unpaid', 'incomplete_expired']:
            Assinatura.objects.filter(stripe_subscription_id=stripe_sub_id).update(ativa=False)

    return HttpResponse(status=200)