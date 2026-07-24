from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from usuarios.models import Usuario
from .serializers import UsuarioSerializer
from drf_spectacular.utils import extend_schema

class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=None, responses={201: UsuarioSerializer})
    def post(self, request):
        return Response({"message": "Endpoint de registro. Implementação completa na Fase 2.5."})

class UserProfileAPIView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UsuarioSerializer

    def get_object(self):
        return self.request.user.perfil_customizado

class ChangePasswordAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        senha_antiga = request.data.get('senha_antiga')
        nova_senha = request.data.get('nova_senha')

        if not senha_antiga or not nova_senha:
            return Response({"error": "Senha antiga e nova senha são obrigatórias."}, status=400)

        if not user.check_password(senha_antiga):
            return Response({"error": "Senha antiga incorreta."}, status=400)

        user.set_password(nova_senha)
        user.save()

        return Response({"message": "Senha atualizada com sucesso!"})
