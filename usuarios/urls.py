from django.urls import path
from .idade_views import elegibilidade
from .views import tela_login, register, logout_view, excluir_conta, aceitar_termos, checar_notificacoes, marcar_lida # views do ParaBook

# ATENÇÃO: Essa linha é obrigatória para o Django enxergar o app "usuarios"
app_name = 'usuarios'

urlpatterns = [
    path('elegibilidade/', elegibilidade, name='elegibilidade'),
    path('login/', tela_login, name='login'),
    path('register/', register, name='register'),
    path('logout/', logout_view, name='logout'),
    path('excluir-conta/', excluir_conta, name='excluir_conta'),

    # NOVA ROTA: Tela de bloqueio/aceite de termos
    path('aceitar-termos/', aceitar_termos, name='aceitar_termos'),

    path('notificacoes/checar/', checar_notificacoes, name='checar_notificacoes'),
    path('notificacoes/lida/<int:id_notificacao>/', marcar_lida, name='marcar_lida'),

]
