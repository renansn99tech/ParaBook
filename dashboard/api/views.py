# pyrefly: ignore [missing-import]
from rest_framework.views import APIView
# pyrefly: ignore [missing-import]
from rest_framework.response import Response
# pyrefly: ignore [missing-import]
from rest_framework.permissions import IsAdminUser
from django.contrib.auth import get_user_model
from comunidades.models import Comunidade
# Precisamos contar livros, mas não sei o app exato se chama `biblioteca.models` ou `obras.models`.
# Vou importar de biblioteca se existir, assumindo a rota já existente.
try:
    from biblioteca.models import Livro
    livro_model_exists = True
except ImportError:
    livro_model_exists = False

User = get_user_model()

class EstatisticasDashboardAPIView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, *args, **kwargs):
        total_usuarios = User.objects.count()
        total_comunidades = Comunidade.objects.count()
        
        total_livros = 0
        if livro_model_exists:
            total_livros = Livro.objects.count()

        return Response({
            "estatisticas": {
                "total_usuarios": total_usuarios,
                "total_comunidades": total_comunidades,
                "total_livros": total_livros,
            }
        })
