from uuid import uuid4

from django import forms
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_http_methods
from rest_framework.exceptions import ValidationError

from .idade import registrar_declaracao, resumo_estado


class DeclaracaoEtariaForm(forms.Form):
    data_nascimento = forms.DateField(label='Data de nascimento', widget=forms.DateInput(attrs={'type': 'date'}))
    confirmacao = forms.BooleanField(label='Confirmo que a informação é correta.')
    chave_idempotencia = forms.UUIDField(widget=forms.HiddenInput)


@never_cache
@login_required
@require_http_methods(['GET', 'POST'])
def elegibilidade(request):
    form = DeclaracaoEtariaForm(request.POST if request.method == 'POST' else None,
                               initial={'chave_idempotencia': uuid4()})
    if request.method == 'POST' and form.is_valid():
        try:
            registrar_declaracao(usuario_auth=request.user,
                                data_nascimento=form.cleaned_data['data_nascimento'],
                                chave_idempotencia=form.cleaned_data['chave_idempotencia'], origem='web')
        except ValidationError:
            form.add_error(None, 'Confira a data e o prazo disponível para uma nova correção.')
        else:
            return redirect('usuarios:elegibilidade')
    return render(request, 'usuarios/elegibilidade.html', {'form': form, 'estado': resumo_estado(request.user)})
