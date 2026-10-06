"""Descarte de um objeto exato, após conferir referências e versões.

Adapter de storage exercitado com InMemoryStorage. Não lista nem apaga órfãos,
prefixos ou buckets; uma referência compartilhada impede apagar o objeto.
"""
import hashlib
import json
from pathlib import PurePosixPath

from django.apps import apps
from django.db import models, transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from usuarios.models import DestinoDescarte, PreservacaoDados
from usuarios.retencao import avaliar_destino
from usuarios.privacidade_conta import evento_descarte_obra

RECURSOS = {
    'perfis.Perfil': {'foto', 'capa'}, 'comunidades.PostagemComunidade': {'imagem'},
    'biblioteca.Livro': {'pdf', 'pdf_amostra', 'capa'}, 'biblioteca.TentativaPublicacao': {'pdf', 'capa'},
}


def _nome_seguro(nome):
    caminho = PurePosixPath(nome.replace('\\', '/'))
    if not nome or caminho.is_absolute() or '..' in caminho.parts or ':' in nome:
        raise ValidationError('Referência de objeto inválida.')
    return nome


def referencias_objeto(nome):
    referencias = []
    for modelo in apps.get_models():
        for campo in modelo._meta.fields:
            if isinstance(campo, models.FileField):
                for pk in modelo.objects.filter(**{campo.name: nome}).values_list('pk', flat=True):
                    referencias.append({'recurso': modelo._meta.label, 'referencia': f'{pk}:{campo.name}'})
    return sorted(referencias, key=lambda r: (r['recurso'], r['referencia']))


def preview_storage(item, *, agora, versoes_conferidas=False):
    nome = _nome_seguro(item.objeto)
    preservacoes = list(PreservacaoDados.objects.filter(destino='storage', recurso=item.recurso,
        recurso_ref=item.recurso_ref, liberada_em__isnull=True))
    evento = item.evento_em
    if item.classe == 'R12':
        modelo = apps.get_model(item.recurso)
        registro = modelo.objects.filter(pk=item.recurso_ref.split(':')[0]).first()
        if registro:
            livro = registro if item.recurso == 'biblioteca.Livro' else registro.solicitacao.livro
            evento = evento_descarte_obra(livro)
    resultado = avaliar_destino(classe=item.classe, evento_em=evento, agora=agora,
        preservacoes=preservacoes, condicoes=[versoes_conferidas is True])
    referencias = referencias_objeto(nome)
    documento = {'item': str(item.protocolo), 'objeto_hash': hashlib.sha256(nome.encode()).hexdigest(),
                 'referencias': referencias, 'versoes_conferidas': versoes_conferidas, **resultado}
    documento['confirmacao'] = hashlib.sha256(json.dumps(documento, default=str, sort_keys=True).encode()).hexdigest()
    return documento


@transaction.atomic
def executar_descarte_storage(*, item, storage, agora, confirmacao, versoes_conferidas=False):
    item = DestinoDescarte.objects.select_for_update().get(pk=item.pk)
    if item.destino != 'storage':
        raise ValidationError('Destino incompatível com este executor.')
    preview = preview_storage(item, agora=agora, versoes_conferidas=versoes_conferidas)
    if preview['confirmacao'] != confirmacao or preview['estado'] != 'elegivel':
        raise ValidationError('Preview alterado, preservação ou condição de descarte não atendida.')
    if item.estado == 'concluido':
        return item
    # Soltar somente a referência própria descrita na prévia, nunca as de
    # terceiros. Descarte da referência e descarte do objeto são separados.
    partes = item.recurso_ref.split(':')
    if len(partes) != 2 or not partes[0].isdecimal() or partes[1] not in RECURSOS.get(item.recurso, set()):
        raise ValidationError('Referência de mídia não suportada.')
    modelo = apps.get_model(item.recurso)
    modelo.objects.filter(pk=int(partes[0]), **{partes[1]: item.objeto}).update(**{partes[1]: ''})
    restantes = referencias_objeto(item.objeto)
    if restantes:
        item.estado = 'preservado'
        item.motivo_codigo = 'objeto_compartilhado_referencia_retirada'
    else:
        # Falha externa não pode marcar conclusão. Se o adapter apagou e a
        # confirmação se perdeu, a próxima tentativa confere ausência primeiro.
        try:
            if storage.exists(item.objeto):
                storage.delete(item.objeto)
            if storage.exists(item.objeto):
                raise OSError('Objeto ainda presente.')
        except Exception:
            item.estado = 'impedido'
            item.motivo_codigo = 'falha_storage_reconferir'
        else:
            if item.recurso in {'biblioteca.Livro', 'biblioteca.TentativaPublicacao'} and partes[1] in {'pdf', 'pdf_amostra'}:
                # Resultado de varredura pertence ao objeto exato; compartilhamento
                # já foi conferido acima. A ausência de objeto não autoriza reuso.
                from biblioteca.models import VerificacaoArquivo
                VerificacaoArquivo.objects.filter(arquivo_nome=item.objeto).delete()
            item.estado = 'concluido'
            item.motivo_codigo = 'objeto_e_versoes_conferidos'
            item.concluido_em = agora
    item.save(update_fields=['estado', 'motivo_codigo', 'concluido_em'])
    return item
