import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('notificacoes', '0002_alter_notificacao_tipo'),
    ]

    operations = [
        migrations.AlterField(
            model_name='notificacao',
            name='tipo',
            field=models.CharField(choices=[('SOLICITACAO', 'Solicitação de Publicação'), ('COMUNIDADE', 'Comunidade/Comentário'), ('ASSINATURA', 'Assinatura & Pagamentos'), ('LIVRO', 'Novidades e Leitura'), ('SISTEMA', 'Sistema/Aviso')], default='SISTEMA', max_length=20, verbose_name='Tipo'),
        ),
        migrations.AlterField(
            model_name='notificacao',
            name='lida',
            field=models.BooleanField(db_index=True, default=False, verbose_name='Lida'),
        ),
        migrations.AlterField(
            model_name='notificacao',
            name='data_criacao',
            field=models.DateTimeField(auto_now_add=True, db_index=True, verbose_name='Data de Criação'),
        ),
        migrations.AddIndex(
            model_name='notificacao',
            index=models.Index(fields=['usuario', 'lida'], name='notif_user_lida_idx'),
        ),
        migrations.CreateModel(
            name='NotificacaoLegadaMigracao',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('legado_id', models.PositiveBigIntegerField(unique=True)),
                ('legado_usuario_id', models.PositiveBigIntegerField(db_index=True)),
                ('link_rejeitado', models.BooleanField(default=False)),
                ('snapshot_pos_migracao_hash', models.CharField(max_length=64)),
                ('migrado_em', models.DateTimeField(auto_now_add=True)),
                ('notificacao', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='migracao_legada_usuarios', to='notificacoes.notificacao')),
            ],
            options={
                'verbose_name': 'Proveniência de notificação legada',
                'verbose_name_plural': 'Proveniências de notificações legadas',
                'db_table': 'notificacoes_migracao_legado_usuarios',
            },
        ),
    ]
