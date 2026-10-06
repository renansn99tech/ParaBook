"""Abertura restrita de um arquivo próprio para atendimento assistido.

Sem endpoint público, URL assinada, caminho aceito do cliente ou cópia de obra
alheia. Identificação e entrega segura continuam pertencendo ao protocolo U/P.
"""
from django.contrib.auth.models import User
from rest_framework.exceptions import NotFound, PermissionDenied

from biblioteca.models import Livro, Perfil as PerfilLegado, TentativaPublicacao
from comunidades.models import PostagemComunidade
from perfis.models import Perfil


def abrir_arquivo_proprio(*, titular, tipo, recurso_id, campo):
    if not titular.is_authenticated or not User.objects.filter(pk=titular.pk, is_active=True).exists():
        raise PermissionDenied('Atendimento exige identidade e acesso vigentes.')
    recursos = {
        'perfil': (Perfil.objects.filter(usuario=titular), {'foto', 'capa'}),
        'perfil_legado': (PerfilLegado.objects.filter(user=titular), {'foto'}),
        'postagem': (PostagemComunidade.objects.filter(autor=titular, retirada_privacidade=False), {'imagem'}),
        'obra': (Livro.objects.filter(solicitacao_publicacao__usuario=titular), {'pdf', 'pdf_amostra', 'capa'}),
        'tentativa': (TentativaPublicacao.objects.filter(solicitacao__usuario=titular), {'pdf', 'capa'}),
    }
    selecao = recursos.get(tipo)
    if selecao is None or campo not in selecao[1] or type(recurso_id) is not int or recurso_id <= 0:
        raise NotFound('Arquivo próprio não localizado para este atendimento.')
    registro = selecao[0].filter(pk=recurso_id).first()
    arquivo = getattr(registro, campo, None)
    if not arquivo:
        raise NotFound('Arquivo próprio não localizado para este atendimento.')
    if campo in {'pdf', 'pdf_amostra'}:
        from biblioteca.quarentena import abrir_pdf_verificado
        return abrir_pdf_verificado(arquivo)
    try:
        return arquivo.open('rb')
    except (OSError, ValueError) as exc:
        raise NotFound('Arquivo próprio indisponível; registrar impedimento por destino.') from exc
