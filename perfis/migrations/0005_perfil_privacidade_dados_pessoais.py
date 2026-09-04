from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('perfis', '0004_alter_perfil_bio'),
    ]

    operations = [
        migrations.AddField(
            model_name='perfil',
            name='exibir_data_nascimento',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='perfil',
            name='exibir_email',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='perfil',
            name='exibir_idade',
            field=models.BooleanField(default=True),
        ),
    ]
