from dataclasses import asdict, dataclass

from django.utils import timezone

from assinaturas.utils import usuario_eh_premium

from .models import Livro
from usuarios.permissions import eh_admin_parabook


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
    if livro.removido_definitivamente_em:
        return DecisaoAcessoObra(False, False, 'remocao_definitiva', 'Obra removida por decisão do Conselho.')
    if autenticado:
        from usuarios.idade import restricao_etaria_ativa
        restrita, _estado = restricao_etaria_ativa(user)
        if restrita:
            autenticado = False
    administrador = bool(
        autenticado and eh_admin_parabook(user)
    )
    from .quarentena import arquivo_liberado
    from django.conf import settings
    tem_amostra = arquivo_liberado(livro.pdf_amostra, conferir_conteudo=False)

    if livro.demonstrativo:
        return DecisaoAcessoObra(
            False, False, 'demonstrativo',
            'Ficha demonstrativa sem arquivo de leitura.',
        )

    from .direitos import estado_direitos
    direitos = estado_direitos(livro, agora=agora)
    if direitos not in {'conferida', 'legado'}:
        return DecisaoAcessoObra(False, False, f'direitos_{direitos}', 'Direitos desta edição indisponíveis para leitura.')
    if not livro.categoria.disponivel_publicamente:
        return DecisaoAcessoObra(False, False, 'categoria_indisponivel', 'Categoria indisponível para leitura.')
    if livro.retirado_em or livro.status in {'retirado', 'suspenso', 'removido', 'manutencao', 'expirado'}:
        return DecisaoAcessoObra(False, False, 'indisponivel', 'Esta obra não está disponível para leitura.')
    if livro.disponivel_de and agora < livro.disponivel_de:
        return DecisaoAcessoObra(False, False, 'ainda_indisponivel', 'Esta obra ainda não está disponível.')
    if livro.disponivel_ate and agora >= livro.disponivel_ate:
        return DecisaoAcessoObra(False, False, 'licenca_encerrada', 'O período de disponibilidade desta obra terminou.')

    if (settings.BOOK_FILE_SCAN_REQUIRED or livro.pdf) and not arquivo_liberado(livro.pdf, conferir_conteudo=False):
        amostra_disponivel = (tem_amostra and livro.status == 'publicado'
                             and (not livro.disponivel_de or agora >= livro.disponivel_de)
                             and (not livro.disponivel_ate or agora < livro.disponivel_ate))
        return DecisaoAcessoObra(False, bool(amostra_disponivel),
                                 'arquivo_em_quarentena', 'Arquivo aguardando verificação de segurança.')

    if administrador:
        return DecisaoAcessoObra(True, tem_amostra, 'administrador', 'Acesso de curadoria.')

    if livro.status != 'publicado':
        return DecisaoAcessoObra(False, False, 'indisponivel', 'Esta obra não está publicada.')
    if livro.disponivel_de and agora < livro.disponivel_de:
        return DecisaoAcessoObra(False, False, 'ainda_indisponivel', 'Esta obra ainda não está disponível.')
    if livro.disponivel_ate and agora >= livro.disponivel_ate:
        return DecisaoAcessoObra(False, False, 'licenca_encerrada', 'O período de disponibilidade desta obra terminou.')

    if livro.modelo_acesso == 'gratuito':
        if not autenticado:
            return DecisaoAcessoObra(
                False, tem_amostra, 'requer_autenticacao', 'Entre na sua conta para ler a obra.'
            )
        return DecisaoAcessoObra(True, tem_amostra, 'gratuito', 'Leitura integral gratuita.')

    if livro.modelo_acesso == 'assinante':
        if autenticado and usuario_eh_premium(user):
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
