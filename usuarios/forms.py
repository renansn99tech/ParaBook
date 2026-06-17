# usuarios/forms.py
from django import forms
from django.contrib.auth.models import User
from django.contrib.auth.forms import UserCreationForm
from django.core.exceptions import ValidationError

class RegistroUsuarioForm(UserCreationForm):
    # Forçamos o e-mail a ser obrigatório no cadastro para enriquecer seu banco
    email = forms.EmailField(required=True, label="E-mail")

    class Meta(UserCreationForm.Meta):
        model = User
        fields = UserCreationForm.Meta.fields + ('email',)

    # Validação cirúrgica de Username Único
    def clean_username(self):
        username = self.cleaned_data.get('username')
        
        # Verifica se já existe no banco de autenticação (ignorando maiúsculas/minúsculas)
        if User.objects.filter(username__iexact=username).exists():
            raise ValidationError("Este nome de usuário já está em uso. Escolha outro.")
            
        return username