"""Preserva poderes administrativos dos operadores anteriores à separação G3.

A Sessão 019 migrou admin de negócio para moderador operacional. Não transformar
esses operadores em superusuários nem ampliar privilégios de novos moderadores.
"""
from django.db import migrations


def preservar(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    Permission = apps.get_model('auth', 'Permission')
    User = apps.get_model('auth', 'User')
    tipo, _ = ContentType.objects.get_or_create(app_label='usuarios', model='casomoderacao')
    permissao, _ = Permission.objects.get_or_create(content_type=tipo, codename='operar_risco_grave',
        defaults={'name': 'Operar P0/P1, suspensão e recursos de moderação'})
    for usuario in User.objects.filter(is_active=True, is_staff=True,
            perfil_customizado__tipo__in=['admin', 'moderador']).iterator():
        usuario.user_permissions.add(permissao)


class Migration(migrations.Migration):
    dependencies = [('usuarios', '0017_alter_casomoderacao_options')]
    operations = [migrations.RunPython(preservar, migrations.RunPython.noop)]
