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
