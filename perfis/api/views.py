# pyrefly: ignore [missing-import]
from rest_framework import generics
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAuthenticated
from perfis.models import Perfil
from .serializers import PerfilSerializer

class PerfilRetrieveUpdateAPIView(generics.RetrieveUpdateAPIView):
    serializer_class = PerfilSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        # Retorna sempre o perfil do usuário logado (token JWT)
        # O signal provavelmente cria um Perfil ao criar um User, então validamos isso.
        perfil, created = Perfil.objects.get_or_create(usuario=self.request.user)
        return perfil
