from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('perfis', '0002_perfil_capa_perfil_meta_leitura_anual'),
    ]

    operations = [
        migrations.AddField(
            model_name='perfil',
            name='tipografia',
            field=models.CharField(
                choices=[
                    ('padrao', 'ParaBook Original'),
                    ('leitura_clara', 'Leitura Clara'),
                    ('oficina_autor', 'Oficina do Autor'),
                    ('edicao_premium', 'Edição Premium'),
                ],
                default='padrao',
                max_length=24,
            ),
        ),
    ]
