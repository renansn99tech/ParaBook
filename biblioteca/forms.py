from django import forms
from .models import Categoria


class ObraAutorForm(forms.Form):
    nome = forms.CharField(max_length=100)
    email = forms.EmailField()
    titulo = forms.CharField(max_length=150)
    descricao = forms.CharField(required=False)
    arquivo = forms.FileField(required=False)
    autor = forms.BooleanField(required=False)
    categoria = forms.IntegerField()

    def clean_categoria(self):
        categoria_id = self.cleaned_data['categoria']

        try:
            categoria = Categoria.objects.get(pk=categoria_id)
        except Categoria.DoesNotExist:
            raise forms.ValidationError("Categoria inválida")

        return categoria

    def clean_arquivo(self):
        arquivo = self.cleaned_data.get('arquivo')

        if arquivo and arquivo.size > 5 * 1024 * 1024:
            raise forms.ValidationError("Arquivo muito grande (máx 5MB).")

        return arquivo