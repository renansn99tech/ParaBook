"""Permite o rito etário sob RLS, com eventos somente de inserção.

Não cria credenciais nem desliga RLS. Revoga escrita/descarte indevidos do
runtime e acesso direto via Data API; o proprietário segue responsável por
migrations e descarte autorizado. A migration 0013 criou a revisão sem policy.
"""
from django.db import migrations


TABLES = (
    'usuarios_estados_etarios',
    'usuarios_eventos_etarios',
    'usuarios_revisaoetaria',
)


def configure(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        raise RuntimeError('Elegibilidade etária exige PostgreSQL.')
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('SELECT rolname FROM pg_roles')
        roles = {row[0] for row in cursor.fetchall()}
        for table in TABLES:
            cursor.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')
            cursor.execute(f'REVOKE ALL ON TABLE "{table}" FROM PUBLIC')
            for role in ('anon', 'authenticated', 'parabook_runtime'):
                if role in roles:
                    cursor.execute(f'REVOKE ALL ON TABLE "{table}" FROM "{role}"')
            if 'parabook_runtime' not in roles:
                continue
            cursor.execute(f'DROP POLICY IF EXISTS elegibilidade_backend ON "{table}"')
            cursor.execute(f'CREATE POLICY elegibilidade_backend ON "{table}" '
                           'TO parabook_runtime USING (true) WITH CHECK (true)')
            rights = 'SELECT, INSERT' if table == 'usuarios_eventos_etarios' else 'SELECT, INSERT, UPDATE'
            cursor.execute(f'GRANT {rights} ON TABLE "{table}" TO parabook_runtime')
            cursor.execute('SELECT pg_get_serial_sequence(%s, %s)', [table, 'id'])
            sequence = cursor.fetchone()[0]
            if sequence:
                cursor.execute(f'GRANT USAGE, SELECT ON SEQUENCE {sequence} TO parabook_runtime')


def reverse(apps, schema_editor):
    # Reversão conserva RLS e a ausência de DELETE/escrita em eventos.
    with schema_editor.connection.cursor() as cursor:
        for table in TABLES:
            cursor.execute(f'DROP POLICY IF EXISTS elegibilidade_backend ON "{table}"')


class Migration(migrations.Migration):
    dependencies = [('usuarios', '0018_preservar_gestores_operacionais')]
    operations = [migrations.RunPython(configure, reverse)]
