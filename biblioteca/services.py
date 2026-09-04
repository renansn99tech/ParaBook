from dataclasses import asdict, dataclass

from django.utils import timezone

from assinaturas.utils import usuario_eh_premium

from .models import Livro


def livros_por_categoria(nome_categoria: str):
    return Livro.objects.filter(categoria__nome__iexact=nome_categoria)


@dataclass(frozen=True)
class DecisaoAcessoObra:
    pode_ler: bool
    pode_ler_amostra: bool
    codigo: str
    mensagem: str
    requer_assinatura: bool = False

    def para_api(self):
        return asdict(self)


def verificar_acesso_obra(user, livro, agora=None):
    """Decide acesso ao conteúdo sem confiar no cliente ou na URL do arquivo."""
    agora = agora or timezone.now()
    autenticado = bool(user and user.is_authenticated)
    administrador = bool(
        autenticado and (user.is_staff or user.is_superuser)
    )

    if administrador:
        return DecisaoAcessoObra(True, bool(livro.pdf_amostra), 'administrador', 'Acesso de curadoria.')

    if livro.status != 'publicado':
        return DecisaoAcessoObra(False, False, 'indisponivel', 'Esta obra não está publicada.')
    if livro.disponivel_de and agora < livro.disponivel_de:
        return DecisaoAcessoObra(False, False, 'ainda_indisponivel', 'Esta obra ainda não está disponível.')
    if livro.disponivel_ate and agora >= livro.disponivel_ate:
        return DecisaoAcessoObra(False, False, 'licenca_encerrada', 'O período de disponibilidade desta obra terminou.')

    tem_amostra = bool(livro.pdf_amostra)
    if livro.modelo_acesso == 'gratuito':
        if not autenticado:
            return DecisaoAcessoObra(
                False, tem_amostra, 'requer_autenticacao', 'Entre na sua conta para ler a obra.'
            )
        return DecisaoAcessoObra(True, tem_amostra, 'gratuito', 'Leitura integral gratuita.')

    if livro.modelo_acesso == 'assinante':
        if usuario_eh_premium(user):
            return DecisaoAcessoObra(True, tem_amostra, 'assinante', 'Incluído na sua assinatura.')
        return DecisaoAcessoObra(
            False,
            tem_amostra,
            'requer_assinatura',
            'Esta obra está incluída nos planos pagos.',
            requer_assinatura=True,
        )

    return DecisaoAcessoObra(
        False, tem_amostra, 'somente_amostra', 'Esta obra está disponível somente como amostra.'
    )
