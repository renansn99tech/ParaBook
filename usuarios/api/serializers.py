from rest_framework import serializers
from django.contrib.auth.models import User
from usuarios.models import Usuario

class UserAuthSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email']

class UsuarioSerializer(serializers.ModelSerializer):
    user_auth = UserAuthSerializer(read_only=True)
    
    class Meta:
        model = Usuario
        fields = ['id', 'user_auth', 'nome', 'tipo', 'cpf', 'termos_aceitos', 'data_aceite_termos']
