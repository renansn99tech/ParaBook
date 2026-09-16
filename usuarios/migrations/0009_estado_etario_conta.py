# Generated manually for an additive, preservation-first rollout.

import uuid

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models
from django.db.migrations.exceptions import IrreversibleError


def criar_estados_iniciais(apps, schema_editor):
    app_label, model_name = settings.AUTH_USER_MODEL.split('.')
    User = apps.get_model(app_label, model_name)
    Estado = apps.get_model('usuarios', 'EstadoEtarioConta')
    Evento = apps.get_model('usuarios', 'EventoEtarioConta')
    alias = schema_editor.connection.alias

    usuarios_sem_estado = list(
        User.objects.using(alias)
        .exclude(pk__in=Estado.objects.using(alias).values('usuario_id'))
        .values_list('pk', flat=True)
    )
    Estado.objects.using(alias).bulk_create(
        [Estado(usuario_id=usuario_id, estado='pendente') for usuario_id in usuarios_sem_estado],
        ignore_conflicts=True,
    )
    Evento.objects.using(alias).bulk_create([
        Evento(
            usuario_id=usuario_id,
            chave_idempotencia=uuid.uuid4(),
            tipo='conta_inicializada',
            estado_anterior='pendente',
            estado_novo='pendente',
            faixa_resultante='desconhecida',
            versao_politica='idade-v1',
            versao_documentos='',
        )
        for usuario_id in usuarios_sem_estado
    ])


def impedir_reversao_destrutiva(apps, schema_editor):
    raise IrreversibleError(
        'A reversão física apagaria estados e evidências etárias. '
        'Desative AGE_POLICY_ACTIVE para rollback operacional seguro.'
    )


class Migration(migrations.Migration):

    dependencies = [
        ('usuarios', '0008_alter_usuario_tipo_eventogovernancaconta_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='usuario',
            name='data_nascimento_eligibilidade',
            field=models.DateField(blank=True, null=True),
        ),
        migrations.CreateModel(
            name='EstadoEtarioConta',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('estado', models.CharField(choices=[('pendente', 'Pendente de declaração'), ('restrito_menor', 'Restrito por menoridade'), ('liberado_adulto', 'Liberado como adulto'), ('em_revisao', 'Em revisão')], db_index=True, default='pendente', max_length=20)),
                ('declaracoes_sucesso', models.PositiveSmallIntegerField(default=0)),
                ('proxima_correcao_permitida_em', models.DateTimeField(blank=True, null=True)),
                ('versao_politica', models.CharField(blank=True, default='', max_length=40)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
                ('usuario', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='estado_etario', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'usuarios_estados_etarios'},
        ),
        migrations.CreateModel(
            name='EventoEtarioConta',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('protocolo', models.UUIDField(default=uuid.uuid4, editable=False, unique=True)),
                ('chave_idempotencia', models.UUIDField(unique=True)),
                ('tipo', models.CharField(choices=[('conta_inicializada', 'Conta inicializada'), ('declaracao_registrada', 'Declaração registrada'), ('correcao_registrada', 'Correção registrada'), ('mudanca_de_faixa', 'Mudança de faixa')], max_length=28)),
                ('estado_anterior', models.CharField(choices=[('pendente', 'Pendente de declaração'), ('restrito_menor', 'Restrito por menoridade'), ('liberado_adulto', 'Liberado como adulto'), ('em_revisao', 'Em revisão')], max_length=20)),
                ('estado_novo', models.CharField(choices=[('pendente', 'Pendente de declaração'), ('restrito_menor', 'Restrito por menoridade'), ('liberado_adulto', 'Liberado como adulto'), ('em_revisao', 'Em revisão')], max_length=20)),
                ('faixa_resultante', models.CharField(choices=[('desconhecida', 'Desconhecida'), ('menor_18', 'Menor de 18'), ('18_mais', '18 ou mais')], max_length=16)),
                ('ordinal_declaracao', models.PositiveSmallIntegerField(default=0)),
                ('proxima_correcao_permitida_em', models.DateTimeField(blank=True, null=True)),
                ('origem', models.CharField(default='web', max_length=16)),
                ('versao_politica', models.CharField(max_length=40)),
                ('versao_documentos', models.CharField(blank=True, default='', max_length=40)),
                ('criado_em', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='eventos_etarios', to=settings.AUTH_USER_MODEL)),
            ],
            options={'db_table': 'usuarios_eventos_etarios', 'ordering': ['-criado_em']},
        ),
        migrations.RunPython(criar_estados_iniciais, impedir_reversao_destrutiva),
    ]
