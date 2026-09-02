import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Cria o superusuario inicial automaticamente caso ele nao exista.'

    def handle(self, *args, **options):
        username = os.getenv('SEED_ADMIN_USERNAME', 'renan-adm')
        email = os.getenv('SEED_ADMIN_EMAIL', 'renan.nascimento6@gmail.com')
        password = os.getenv('SEED_ADMIN_PASSWORD', 'parabook123')

        if not User.objects.filter(username=username).exists():
            User.objects.create_superuser(
                username=username, 
                email=email, 
                password=password
            )
            self.stdout.write(self.style.SUCCESS(f'Superusuario "{username}" criado com sucesso!'))
        else:
            self.stdout.write(self.style.WARNING(f'Superusuario "{username}" ja existe no banco de dados.'))