# usuarios/forms.py
from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError

class RegistroUsuarioForm(UserCreationForm):
    # Captura o primeiro nome (ou nome completo) para salvar no banco
    nome_completo = forms.CharField(
        max_length=150, 
        required=True, 
        label="Nome Completo",
        widget=forms.TextInput(attrs={'autocomplete': 'name'})
    )
    email = forms.EmailField(required=True, label="E-mail")

    # NOVO CAMPO: Validação obrigatória do Django
    termos_aceitos = forms.BooleanField(
        required=True,
        label="Termos de Uso",
        error_messages={'required': 'Você deve ler e aceitar as Diretrizes da plataforma para criar uma conta.'}
    )

    class Meta(UserCreationForm.Meta):
        model = User
        # Definimos a ordem exata de exibição no HTML automático
        fields = ('username', 'nome_completo', 'email', 'termos_aceitos')

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError("Este nome de usuário já está em uso. Escolha outro.")
        return username

    # VALIDAÇÃO SÊNIOR: Impede e-mails duplicados na tabela auth_user
    def clean_email(self):
        email = self.cleaned_data.get('email').lower()
        if User.objects.filter(email=email).exists():
            raise ValidationError("Este e-mail já está cadastrado em nosso sistema.")
        return email