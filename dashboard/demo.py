"""Visibilidade do conteúdo demonstrativo, decidida sempre no backend."""

from dashboard.models import FeatureFlag
from usuarios.permissions import eh_admin_parabook


CHAVE_CONTEUDO_DEMONSTRATIVO = 'conteudo_demonstrativo'


def conteudo_demonstrativo_ativo():
    return FeatureFlag.objects.filter(
        chave=CHAVE_CONTEUDO_DEMONSTRATIVO,
        habilitada=True,
        disponivel=True,
    ).exists()


def pode_ver_conteudo_demonstrativo(user):
    return eh_admin_parabook(user) or conteudo_demonstrativo_ativo()


def filtrar_conteudo_demonstrativo(queryset, user, prefixo=''):
    if pode_ver_conteudo_demonstrativo(user):
        return queryset
    return queryset.filter(**{f'{prefixo}chave_demonstrativa__isnull': True})
