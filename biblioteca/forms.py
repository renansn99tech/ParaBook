# forms.py
from django import forms
from django.conf import settings
from .models import Livro, Categoria


class ObraAutorForm(forms.ModelForm):
    # Campos que não pertencem ao model Livro, mas são necessários para o fluxo de termos/autoria
    nome = forms.CharField(
        max_length=100, 
        required=True, 
        label="Nome do Autor",
        widget=forms.TextInput(attrs={'readonly': 'readonly'})
    )
    email = forms.EmailField(
        required=True, 
        label="E-mail",
        widget=forms.EmailInput(attrs={'readonly': 'readonly'})
    )
    cpf_autor = forms.CharField(max_length=14, required=False, label="CPF do Autor")
    registro_autoral = forms.CharField(max_length=100, required=False, label="Registro Autoral")
    numero_registro = forms.CharField(max_length=20, required=False, label="Número do Registro")
    declaracao_autoria = forms.BooleanField(required=True, label="Declaro que sou o autor da obra")
    aceitou_termos = forms.BooleanField(required=True, label="Aceito os termos de uso")

    class Meta:
        model = Livro
        # Campos bibliográficos do Livro que o autor deve preencher
        fields = [
            'titulo',
            'categoria',
            'paginas',
            'ano_publicacao',
            'isbn',
            'edicao',
            'capa',
            'pdf',
        ]
        # Customização dos campos herdados do model
        widgets = {
            'titulo': forms.TextInput(attrs={'placeholder': 'Digite o título da obra'}),
            'isbn': forms.TextInput(attrs={'placeholder': 'Opcional'}),
            'paginas': forms.NumberInput(attrs={'placeholder': 'Ex: 120'}),
            'ano_publicacao': forms.NumberInput(attrs={'placeholder': 'Ex: 2026'}),
            'edicao': forms.TextInput(attrs={'placeholder': 'Ex: 1ª Edição'}),
        }

    def clean_pdf(self):
        # Validação do arquivo PDF enviado, mantendo a regra de tamanho máximo
        pdf = self.cleaned_data.get('pdf')

        if not pdf:
            raise forms.ValidationError("O arquivo PDF do livro é obrigatório.")

        if pdf.size > settings.MAX_BOOK_UPLOAD_SIZE:
            # Converte bytes para MB para uma mensagem mais amigável
            max_mb = settings.MAX_BOOK_UPLOAD_SIZE / (1024 * 1024)
            raise forms.ValidationError(
                f"O arquivo enviado é muito grande. O tamanho máximo permitido é de {max_mb:.1f}MB."
            )

        return pdf

    def clean_capa(self):
        # Opcional: Garante que se houver capa, ela seja uma imagem válida
        capa = self.cleaned_data.get('capa')
        return capa