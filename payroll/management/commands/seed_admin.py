import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Garante a criação ou atualização do superusuário inicial.'

    def handle(self, *args, **options):
        username = os.getenv('SEED_ADMIN_USERNAME', 'renan-adm')
        email = os.getenv('SEED_ADMIN_EMAIL', 'renan.nascimento6@gmail.com')
        password = os.getenv('SEED_ADMIN_PASSWORD', 'parabook123')

        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': email, 'is_staff': True, 'is_superuser': True}
        )

        # Força a atualização do hash da senha, e-mail e privilégios
        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)  # Criptografa a senha corretamente
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f'Superusuário "{username}" criado com sucesso!'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Senha e permissões do superusuário "{username}" foram atualizadas!'))