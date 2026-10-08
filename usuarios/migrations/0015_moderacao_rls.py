"""G3 segregado da Data API; causas impeditivas não são editáveis pelo runtime."""
from django.db import migrations

TABELAS = ('usuarios_calendariomoderacao', 'usuarios_casomoderacao', 'usuarios_eventomoderacao',
           'usuarios_recursomoderacao', 'usuarios_pedidoconselho', 'usuarios_aprovacaoconselho',
           'usuarios_impedimentomoderacao', 'usuarios_limitemoderacao')


def restringir(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        raise RuntimeError('Moderação exige PostgreSQL.')
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('SELECT rolname FROM pg_roles')
        roles = {row[0] for row in cursor.fetchall()}
        for tabela in TABELAS:
            cursor.execute(f'ALTER TABLE "{tabela}" ENABLE ROW LEVEL SECURITY')
            cursor.execute(f'REVOKE ALL ON TABLE "{tabela}" FROM PUBLIC')
            for role in ('anon', 'authenticated', 'parabook_censo', 'parabook_runtime'):
                if role in roles:
                    cursor.execute(f'REVOKE ALL ON TABLE "{tabela}" FROM "{role}"')
            if 'parabook_runtime' in roles:
                cursor.execute(f'CREATE POLICY moderacao_backend ON "{tabela}" TO parabook_runtime USING (true) WITH CHECK (true)')
                cursor.execute(f'GRANT SELECT ON TABLE "{tabela}" TO parabook_runtime')
                if tabela != 'usuarios_impedimentomoderacao':
                    cursor.execute(f'GRANT INSERT ON TABLE "{tabela}" TO parabook_runtime')
                    if tabela not in ('usuarios_eventomoderacao', 'usuarios_aprovacaoconselho', 'usuarios_calendariomoderacao'):
                        cursor.execute(f'GRANT UPDATE ON TABLE "{tabela}" TO parabook_runtime')
                    cursor.execute('SELECT pg_get_serial_sequence(%s, %s)', [tabela, 'id' if tabela != 'usuarios_limitemoderacao' else 'chave'])
                    sequencia = cursor.fetchone()[0]
                    if sequencia:
                        cursor.execute(f'GRANT USAGE, SELECT ON SEQUENCE {sequencia} TO parabook_runtime')


class Migration(migrations.Migration):
    dependencies = [('usuarios', '0014_impedimentomoderacao_limitemoderacao_and_more')]
    operations = [migrations.RunPython(restringir, migrations.RunPython.noop)]
