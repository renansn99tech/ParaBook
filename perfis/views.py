from django.shortcuts import render

def perfil(request):
    return render(request, 'perfis/perfil.html')

def admin(request):
    return render(request, 'perfis/admin.html')
