import hashlib
import json
from urllib.parse import urlsplit

from django.db import migrations


CAMPOS_SNAPSHOT = (
    'usuario_id',
    'titulo',
    'mensagem',
    'tipo',
    'link',
    'lida',
    'data_criacao',
)


def _normalizar(valor):
    if hasattr(valor, 'isoformat'):
        return valor.isoformat()
    return valor


def _snapshot_hash(notificacao):
    estado = {campo: _normalizar(getattr(notificacao, campo)) for campo in CAMPOS_SNAPSHOT}
    serializado = json.dumps(
        estado,
        ensure_ascii=False,
        sort_keys=True,
        separators=(',', ':'),
    )
    return hashlib.sha256(serializado.encode('utf-8')).hexdigest()


def _link_interno_seguro(link):
    if not link:
        return link
    link = link.strip()
    if not link or '\\' in link or any(ord(caractere) < 32 for caractere in link):
        return None
    try:
        partes = urlsplit(link)
    except ValueError:
        return None
    if partes.scheme or partes.netloc or not partes.path.startswith('/'):
        return None
    if partes.path.startswith('//'):
        return None
    return link


def migrar_notificacoes_legadas(apps, schema_editor):
    NotificacaoCanonica = apps.get_model('notificacoes', 'Notificacao')
    NotificacaoLegada = apps.get_model('usuarios', 'Notificacao')
    Proveniencia = apps.get_model('notificacoes', 'NotificacaoLegadaMigracao')
    alias = schema_editor.connection.alias

    legadas = NotificacaoLegada.objects.using(alias).order_by('pk').iterator(chunk_size=500)
    for legada in legadas:
        if Proveniencia.objects.using(alias).filter(legado_id=legada.pk).exists():
            continue

        link = _link_interno_seguro(legada.link_destino)
        notificacao = NotificacaoCanonica.objects.using(alias).create(
            usuario_id=legada.usuario_id,
            titulo=legada.titulo,
            mensagem=legada.mensagem,
            tipo=legada.tipo,
            link=link,
            lida=legada.lida,
        )
        NotificacaoCanonica.objects.using(alias).filter(pk=notificacao.pk).update(
            data_criacao=legada.data_criacao,
        )
        notificacao.data_criacao = legada.data_criacao
        Proveniencia.objects.using(alias).create(
            notificacao_id=notificacao.pk,
            legado_id=legada.pk,
            legado_usuario_id=legada.usuario_id,
            link_rejeitado=bool(legada.link_destino and link is None),
            snapshot_pos_migracao_hash=_snapshot_hash(notificacao),
        )


def reverter_notificacoes_legadas(apps, schema_editor):
    Proveniencia = apps.get_model('notificacoes', 'NotificacaoLegadaMigracao')
    alias = schema_editor.connection.alias

    registros = Proveniencia.objects.using(alias).select_related('notificacao').order_by('-pk')
    for registro in registros.iterator(chunk_size=500):
        notificacao = registro.notificacao
        if _snapshot_hash(notificacao) == registro.snapshot_pos_migracao_hash:
            notificacao.delete()

    Proveniencia.objects.using(alias).all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('notificacoes', '0003_notificacaolegadomigracao_e_indices'),
        ('usuarios', '0007_usuario_notificacoes_assinaturas_and_more'),
    ]

    operations = [
        migrations.RunPython(migrar_notificacoes_legadas, reverter_notificacoes_legadas),
    ]
