# pyrefly: ignore [missing-import]
from rest_framework import serializers
from perfis.models import Perfil

class PerfilSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='usuario.username', required=False)
    email = serializers.CharField(source='usuario.email', read_only=True)
    tipo = serializers.CharField(source='usuario.perfil_customizado.tipo', read_only=True)
    nome = serializers.CharField(source='usuario.perfil_customizado.nome', required=False)

    class Meta:
        model = Perfil
        fields = ['id', 'usuario', 'username', 'email', 'nome', 'tipo', 'historico', 'descricao_perfil', 'foto', 'bio', 'localizacao', 'perfil_privado']
        read_only_fields = ['id', 'usuario', 'tipo', 'email']

    def update(self, instance, validated_data):
        usuario_data = validated_data.pop('usuario', {})
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if usuario_data:
            user = instance.usuario
            if 'username' in usuario_data:
                user.username = usuario_data['username']
                user.save()
                
            perfil_customizado = getattr(user, 'perfil_customizado', None)
            if perfil_customizado and 'perfil_customizado' in usuario_data:
                if 'nome' in usuario_data['perfil_customizado']:
                    perfil_customizado.nome = usuario_data['perfil_customizado']['nome']
                    perfil_customizado.save()
                    
        return instance
