import hashlib
import json

from django.db import migrations


CAMPOS_COMPARTILHADOS = ('foto', 'bio', 'localizacao')
CAMPOS_SNAPSHOT = (
    'historico',
    'descricao_perfil',
    'foto',
    'capa',
    'bio',
    'localizacao',
    'meta_leitura_anual',
    'tipografia',
    'exibir_idade',
    'exibir_data_nascimento',
    'exibir_email',
    'perfil_privado',
)


def _normalizar(valor):
    if hasattr(valor, 'name'):
        valor = valor.name
    return valor


def _hash(valor):
    serializado = json.dumps(
        _normalizar(valor),
        ensure_ascii=False,
        sort_keys=True,
        separators=(',', ':'),
    )
    return hashlib.sha256(serializado.encode('utf-8')).hexdigest()


def _snapshot_hash(perfil):
    estado = {campo: _normalizar(getattr(perfil, campo)) for campo in CAMPOS_SNAPSHOT}
    return _hash(estado)


def migrar_perfis_legados(apps, schema_editor):
    PerfilCanonico = apps.get_model('perfis', 'Perfil')
    PerfilLegado = apps.get_model('biblioteca', 'Perfil')
    Proveniencia = apps.get_model('perfis', 'PerfilLegadoMigracao')
    alias = schema_editor.connection.alias

    legados = PerfilLegado.objects.using(alias).order_by('pk').iterator(chunk_size=500)
    for legado in legados:
        if Proveniencia.objects.using(alias).filter(legado_id=legado.pk).exists():
            continue

        perfil, criado = PerfilCanonico.objects.using(alias).get_or_create(
            usuario_id=legado.user_id,
        )
        campos_preenchidos = []
        conflitos = []
        valores_anteriores = {}
        hashes_migrados = {}

        for campo in CAMPOS_COMPARTILHADOS:
            atual = _normalizar(getattr(perfil, campo))
            valor_legado = _normalizar(getattr(legado, campo))
            if valor_legado in (None, ''):
                continue
            if atual in (None, ''):
                valores_anteriores[campo] = atual
                setattr(perfil, campo, valor_legado)
                campos_preenchidos.append(campo)
                hashes_migrados[campo] = _hash(valor_legado)
            elif atual != valor_legado:
                conflitos.append(campo)

        if campos_preenchidos:
            perfil.save(update_fields=campos_preenchidos)
        perfil.refresh_from_db()

        Proveniencia.objects.using(alias).create(
            perfil_id=perfil.pk,
            legado_id=legado.pk,
            legado_usuario_id=legado.user_id,
            perfil_criado=criado,
            campos_preenchidos=campos_preenchidos,
            conflitos=conflitos,
            valores_anteriores=valores_anteriores,
            hashes_migrados=hashes_migrados,
            snapshot_pos_migracao_hash=_snapshot_hash(perfil),
            status_legado=legado.status or '',
        )


def reverter_perfis_legados(apps, schema_editor):
    Proveniencia = apps.get_model('perfis', 'PerfilLegadoMigracao')
    alias = schema_editor.connection.alias

    registros = Proveniencia.objects.using(alias).select_related('perfil').order_by('-pk')
    for registro in registros.iterator(chunk_size=500):
        perfil = registro.perfil
        if registro.perfil_criado:
            if _snapshot_hash(perfil) == registro.snapshot_pos_migracao_hash:
                perfil.delete()
            continue

        restaurar = {}
        for campo in registro.campos_preenchidos:
            hash_esperado = registro.hashes_migrados.get(campo)
            if hash_esperado and _hash(getattr(perfil, campo)) == hash_esperado:
                restaurar[campo] = registro.valores_anteriores.get(campo)
        if restaurar:
            perfil.__class__.objects.using(alias).filter(pk=perfil.pk).update(**restaurar)

    Proveniencia.objects.using(alias).all().delete()


class Migration(migrations.Migration):

    dependencies = [
        ('biblioteca', '0011_denuncia_decisao_denuncia_evidencias_and_more'),
        ('perfis', '0007_perfillegadomigracao'),
    ]

    operations = [
        migrations.RunPython(migrar_perfis_legados, reverter_perfis_legados),
    ]
