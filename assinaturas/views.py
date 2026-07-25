import stripe
from django.conf import settings
from django.shortcuts import render,redirect, get_object_or_404
from django.contrib.auth.decorators import login_required
from .models import Plano

stripe.api_key = settings.STRIPE_SECRET_KEY

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