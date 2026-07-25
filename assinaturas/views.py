import os
import stripe
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render,redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import get_user_model
from .models import Plano, Assinatura

stripe.api_key = getattr(settings, 'STRIPE_SECRET_KEY', os.getenv('STRIPE_SECRET_KEY'))
User = get_user_model()

@login_required
def listar_planos(request):
    planos = Plano.objects.all().order_by('preco')
    return render(request, 'assinaturas/planos.html', {'planos': planos})

@login_required
def minha_assinatura(request):
    """
    Exibe os detalhes da assinatura atual do usuário logado.
    """
    # Recupera a assinatura se existir, senão retorna None de forma segura
    assinatura = getattr(request.user, 'assinatura', None)
    
    context = {
        'assinatura': assinatura,
    }
    return render(request, 'assinaturas/minha_assinatura.html', context)


@login_required
def criar_sessao_checkout(request, plano_id):
    plano = get_object_or_404(Plano, id=plano_id)
    checkout_session = stripe.checkout.Session.create(
        payment_method_types=['card'],
        line_items=[{
            'price': plano.stripe_price_id,
            'quantity': 1,
        }],
        mode='subscription',
        success_url=request.build_absolute_uri('/assinaturas/minha-assinatura/?sucesso=true'),
        cancel_url=request.build_absolute_uri('/planos/?cancelado=true'),
        client_reference_id=str(request.user.id),
    )
    return redirect(checkout_session.url, code=330)

@csrf_exempt
def stripe_webhook(request):
    """
    Endpoint isento de CSRF que recebe eventos assíncronos enviados pela Stripe.
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    webhook_secret = getattr(settings, 'STRIPE_WEBHOOK_SECRET', os.getenv('STRIPE_WEBHOOK_SECRET'))

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError:
        # Payload inválido
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError:
        # Assinatura do webhook inválida
        return HttpResponse(status=400)

    # Trata a confirmação de pagamento do Checkout
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        user_id = session.get('client_reference_id')
        customer_id = session.get('customer')
        subscription_id = session.get('subscription')
        plano_id = session.get('metadata', {}).get('plano_id')

        if user_id and plano_id:
            try:
                usuario = User.objects.get(id=user_id)
                plano = Plano.objects.get(id=plano_id)
                
                # Busca ou cria a assinatura do usuário
                assinatura, created = Assinatura.objects.get_or_create(usuario=usuario)
                assinatura.plano = plano
                assinatura.ativa = True
                assinatura.stripe_customer_id = customer_id
                assinatura.stripe_subscription_id = subscription_id
                assinatura.save()

            except (User.DoesNotExist, Plano.DoesNotExist):
                return HttpResponse(status=404)

    return HttpResponse(status=200)