from django import forms
from .models import Categoria
from django.conf import settings

class ObraAutorForm(forms.Form):
    nome = forms.CharField(max_length=100)
    email = forms.EmailField()
    titulo = forms.CharField(max_length=150)
    descricao = forms.CharField(required=False)
    arquivo = forms.FileField(required=True)
    autor = forms.BooleanField(required=False)
    categoria = forms.IntegerField()
    cpf_autor = forms.CharField(max_length=14, required=False)
    isbn = forms.CharField(max_length=20, required=False)
    registro_autoral = forms.CharField(max_length=100,required=False)
    numero_registro = forms.CharField(max_length=20)
    declaracao_autoria = forms.BooleanField(required=False)
    aceitou_termos = forms.BooleanField(required=False)

    def clean_categoria(self):
        categoria_id = self.cleaned_data['categoria']

        try:
            categoria = Categoria.objects.get(pk=categoria_id)
        except Categoria.DoesNotExist:
            raise forms.ValidationError("Categoria inválida")

        return categoria

def clean_arquivo(self):
    arquivo = self.cleaned_data.get('arquivo')

    if arquivo and arquivo.size > settings.MAX_BOOK_UPLOAD_SIZE:
        raise forms.ValidationError(
            "Arquivo muito grande (máx 5MB)."
        )

    return arquivo