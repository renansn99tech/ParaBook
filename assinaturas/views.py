from django.shortcuts import render
from .models import Plano

def listar_planos(request):
    planos = Plano.objects.all().order_by('preco')
    return render(request, 'assinaturas/planos.html', {'planos': planos})