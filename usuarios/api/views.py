from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.db import transaction
from usuarios.models import Usuario
from .serializers import UsuarioSerializer, RegisterSerializer
from drf_spectacular.utils import extend_schema


class RegisterAPIView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(request=RegisterSerializer, responses={201: None})
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            auth_user = serializer.save()

        # Gera tokens JWT para login automático após o cadastro
        refresh = RefreshToken.for_user(auth_user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }, status=status.HTTP_201_CREATED)


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

