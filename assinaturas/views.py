import os
import stripe
from django.conf import settings
from django.http import HttpResponse
from django.shortcuts import render, redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Plano, Assinatura


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

    # Trata Plano Gratuito ou sem ID da Stripe diretamente no banco
    if plano.preco > 0 and not settings.PAYMENTS_ENABLED:
        return HttpResponse(
            'Assinaturas pagas estarão disponíveis em uma próxima etapa do ParaBook.',
            status=503,
        )

    if plano.preco == 0 or not plano.stripe_price_id:
        assinatura, _ = Assinatura.objects.get_or_create(usuario=request.user)
        assinatura.plano = plano
        assinatura.ativa = True
        assinatura.stripe_customer_id = None
        assinatura.stripe_subscription_id = None
        assinatura.data_fim = None
        assinatura.save()
        return redirect('assinaturas:minha_assinatura')

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
    Gera a sessão do Stripe Customer Portal e redireciona o usuário.
    """
    if not settings.PAYMENTS_ENABLED:
        return HttpResponse(
            'O gerenciamento de pagamentos ainda não está disponível.',
            status=503,
        )
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


