"""Visibilidade do conteúdo demonstrativo, decidida sempre no backend."""

from dashboard.models import FeatureFlag


CHAVE_CONTEUDO_DEMONSTRATIVO = 'conteudo_demonstrativo'


def conteudo_demonstrativo_ativo():
    return FeatureFlag.objects.filter(
        chave=CHAVE_CONTEUDO_DEMONSTRATIVO,
        habilitada=True,
        disponivel=True,
    ).exists()


def pode_ver_conteudo_demonstrativo(user):
    """A flag controla a vitrine para todos, inclusive administradores.

    O parâmetro ``user`` é mantido para preservar a API dos filtros existentes.
    A administração do conteúdo continua sendo feita pela feature flag; desligá-la
    não remove os registros e ligá-la torna os exemplos visíveis novamente.
    """
    del user
    return conteudo_demonstrativo_ativo()


def filtrar_conteudo_demonstrativo(queryset, user, prefixo=''):
    if pode_ver_conteudo_demonstrativo(user):
        return queryset
    return queryset.filter(**{f'{prefixo}chave_demonstrativa__isnull': True})
