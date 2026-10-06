"""As novas tabelas restritas não herdam acesso direto pela Data API.

Não cria login/credencial. Em PostgreSQL sem as roles Supabase, apenas habilita
RLS e revoga PUBLIC. O proprietário de migrations conserva a operação local.
"""
from django.db import migrations

TABELAS = (
    'usuarios_encerramentoconta', 'usuarios_destinodescarte',
    'usuarios_preservacaodados', 'usuarios_provaprivacidade',
)


def restringir_tabelas(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        raise RuntimeError('Privacidade exige PostgreSQL.')
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('SELECT rolname FROM pg_roles')
        roles = {linha[0] for linha in cursor.fetchall()}
        for tabela in TABELAS:
            cursor.execute(f'ALTER TABLE "{tabela}" ENABLE ROW LEVEL SECURITY')
            cursor.execute(f'REVOKE ALL ON TABLE "{tabela}" FROM PUBLIC')
            for role in ('anon', 'authenticated', 'parabook_censo', 'parabook_runtime'):
                if role in roles:
                    cursor.execute(f'REVOKE ALL ON TABLE "{tabela}" FROM "{role}"')
            if 'parabook_runtime' in roles:
                cursor.execute(f'DROP POLICY IF EXISTS privacidade_backend ON "{tabela}"')
                cursor.execute(f'CREATE POLICY privacidade_backend ON "{tabela}" TO parabook_runtime USING (true) WITH CHECK (true)')
                cursor.execute(f'GRANT SELECT ON TABLE "{tabela}" TO parabook_runtime')
                if tabela != 'usuarios_preservacaodados':
                    cursor.execute(f'GRANT INSERT ON TABLE "{tabela}" TO parabook_runtime')
                    if tabela == 'usuarios_provaprivacidade':
                        cursor.execute(f'GRANT UPDATE (usuario_id, encerramento_id, expira_em) ON TABLE "{tabela}" TO parabook_runtime')
                    else:
                        cursor.execute(f'GRANT UPDATE ON TABLE "{tabela}" TO parabook_runtime')
                    cursor.execute('SELECT pg_get_serial_sequence(%s, %s)', [tabela, 'id'])
                    sequencia = cursor.fetchone()[0]
                    cursor.execute(f'GRANT USAGE, SELECT ON SEQUENCE {sequencia} TO parabook_runtime')


def reverter(apps, schema_editor):
    # Rollback de segurança não abre tabelas pessoais nem restaura grants de
    # Data API. Os modelos serão removidos pela reversão das migrations aditivas.
    with schema_editor.connection.cursor() as cursor:
        for tabela in TABELAS:
            cursor.execute(f'DROP POLICY IF EXISTS privacidade_backend ON "{tabela}"')


class Migration(migrations.Migration):
    dependencies = [('usuarios', '0011_provaprivacidade_recurso_and_more')]
    operations = [migrations.RunPython(restringir_tabelas, reverter)]
