from django.db import migrations
from django.db.models import F


def preencher_datas_de_conclusao(apps, schema_editor):
    Biblioteca = apps.get_model('biblioteca', 'Biblioteca')
    Biblioteca.objects.filter(
        status='lido',
        data_conclusao__isnull=True,
    ).update(data_conclusao=F('data_adicao'))


class Migration(migrations.Migration):
    dependencies = [
        ('biblioteca', '0006_biblioteca_data_conclusao_biblioteca_pagina_atual_and_more'),
    ]

    operations = [
        migrations.RunPython(preencher_datas_de_conclusao, migrations.RunPython.noop),
    ]
