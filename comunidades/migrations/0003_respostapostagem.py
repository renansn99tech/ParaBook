import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('comunidades', '0002_denunciacomunidade_data_analise_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='RespostaPostagem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('conteudo', models.TextField(max_length=1200)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('autor', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='respostas_comunidade', to=settings.AUTH_USER_MODEL)),
                ('postagem', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='respostas', to='comunidades.postagemcomunidade')),
            ],
            options={
                'ordering': ['criado_em'],
                'indexes': [
                    models.Index(fields=['postagem', 'criado_em'], name='com_post_criado_idx'),
                    models.Index(fields=['autor', 'criado_em'], name='com_resp_autor_criado_idx'),
                ],
            },
        ),
    ]
