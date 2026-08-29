from django.db import migrations


FRASE_STATUS_PADRAO_LEITOR = "Olá! Sou um novo leitor do ParaBook."
FRASE_STATUS_PADRAO_AUTOR = "Olá! Sou um novo autor do ParaBook."


def atualizar_autores_sem_status_personalizado(apps, schema_editor):
    Perfil = apps.get_model('perfis', 'Perfil')
    Usuario = apps.get_model('usuarios', 'Usuario')
    autores = Usuario.objects.filter(tipo='autor').values_list('user_auth_id', flat=True)
    Perfil.objects.filter(
        usuario_id__in=autores,
        descricao_perfil=FRASE_STATUS_PADRAO_LEITOR,
    ).update(descricao_perfil=FRASE_STATUS_PADRAO_AUTOR)


class Migration(migrations.Migration):
    dependencies = [
        ('perfis', '0005_perfil_privacidade_dados_pessoais'),
        ('usuarios', '0007_usuario_notificacoes_assinaturas_and_more'),
    ]

    operations = [
        migrations.RunPython(
            atualizar_autores_sem_status_personalizado,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
