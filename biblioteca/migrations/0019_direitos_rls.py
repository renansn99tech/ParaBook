"""Direitos e varredura fora da Data API; runtime sem DELETE de licenças."""
from django.db import migrations


def restringir(apps, schema_editor):
    if schema_editor.connection.vendor != 'postgresql':
        raise RuntimeError('Direitos exigem PostgreSQL.')
    with schema_editor.connection.cursor() as cursor:
        cursor.execute('SELECT rolname FROM pg_roles')
        roles = {row[0] for row in cursor.fetchall()}
        for tabela in ('biblioteca_licencaobra', 'biblioteca_verificacoes_arquivos'):
            cursor.execute(f'ALTER TABLE "{tabela}" ENABLE ROW LEVEL SECURITY')
            cursor.execute(f'REVOKE ALL ON TABLE "{tabela}" FROM PUBLIC')
            for role in ('anon', 'authenticated', 'parabook_censo', 'parabook_runtime'):
                if role in roles:
                    cursor.execute(f'REVOKE ALL ON TABLE "{tabela}" FROM "{role}"')
            if 'parabook_runtime' in roles:
                cursor.execute(f'CREATE POLICY direitos_backend ON "{tabela}" TO parabook_runtime USING (true) WITH CHECK (true)')
                cursor.execute(f'GRANT SELECT, INSERT, UPDATE ON "{tabela}" TO parabook_runtime')
                cursor.execute('SELECT pg_get_serial_sequence(%s, %s)', [tabela, 'id'])
                sequencia = cursor.fetchone()[0]
                if sequencia:
                    cursor.execute(f'GRANT USAGE, SELECT ON SEQUENCE {sequencia} TO parabook_runtime')


class Migration(migrations.Migration):
    dependencies = [('biblioteca', '0018_tentativapublicacao_pdf_amostra_and_more')]
    operations = [migrations.RunPython(restringir, migrations.RunPython.noop)]
