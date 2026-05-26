from django.shortcuts import render

def index(request):
    return render(request, 'index.html')

def mobile_navbar(request):
    return render(request, 'mobile-navbar.html')
