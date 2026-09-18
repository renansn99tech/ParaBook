from django.db import migrations, models


def tornar_campos_legados_privados(apps, schema_editor):
    Perfil = apps.get_model('perfis', 'Perfil')
    Perfil.objects.filter(exibir_idade=True).update(exibir_idade=False)
    Perfil.objects.filter(exibir_data_nascimento=True).update(exibir_data_nascimento=False)


class Migration(migrations.Migration):
    dependencies = [('perfis', '0008_consolidar_perfis_legados')]

    operations = [
        migrations.AddField(
            model_name='perfil',
            name='exibir_aniversario_sem_ano',
            field=models.BooleanField(default=False),
        ),
        migrations.RunPython(tornar_campos_legados_privados, migrations.RunPython.noop),
    ]
