# pyrefly: ignore [missing-import]
from rest_framework import serializers
from perfis.models import Perfil

class PerfilSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='usuario.username', read_only=True)
    email = serializers.CharField(source='usuario.email', read_only=True)

    class Meta:
        model = Perfil
        fields = ['id', 'usuario', 'username', 'email', 'historico', 'descricao_perfil', 'foto', 'bio', 'localizacao', 'perfil_privado']
        read_only_fields = ['id', 'usuario']
