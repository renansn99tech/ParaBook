from django.db import migrations

def popular_categorias(apps, schema_editor):
    # Obtém o modelo Categoria do histórico do projeto
    Categoria = apps.get_model('biblioteca', 'Categoria')

    # Lista de categorias baseada na sua view 'biblioteca'
    nomes_categorias = ['Filosofia', 'Literatura', 'Religiosos', 'Exatas', 'Infantis']

    for nome in nomes_categorias:
        Categoria.objects.get_or_create(nome=nome)

class Migration(migrations.Migration):

    dependencies = [
        ('biblioteca', '0001_initial'), # Garanta que o nome da sua migration inicial esteja correto aqui
    ]

    operations = [
        migrations.RunPython(popular_categorias),
    ]