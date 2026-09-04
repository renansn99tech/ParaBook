import os

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email

User = get_user_model()


class Command(BaseCommand):
    help = 'Cria ou atualiza o superusuário inicial usando variáveis obrigatórias.'

    def handle(self, *args, **options):
        values = {
            'SEED_ADMIN_USERNAME': os.getenv('SEED_ADMIN_USERNAME', '').strip(),
            'SEED_ADMIN_EMAIL': os.getenv('SEED_ADMIN_EMAIL', '').strip(),
            'SEED_ADMIN_PASSWORD': os.getenv('SEED_ADMIN_PASSWORD', ''),
        }
        missing = [name for name, value in values.items() if not value]
        if missing:
            raise CommandError(
                'Defina as variáveis obrigatórias: ' + ', '.join(missing)
            )

        username = values['SEED_ADMIN_USERNAME']
        email = values['SEED_ADMIN_EMAIL']
        password = values['SEED_ADMIN_PASSWORD']

        candidate = User(username=username, email=email)
        try:
            validate_email(email)
            validate_password(password, user=candidate)
        except ValidationError as exc:
            raise CommandError('Credenciais administrativas inválidas: ' + ' '.join(exc.messages)) from exc

        user, created = User.objects.get_or_create(
            username=username,
            defaults={'email': email, 'is_staff': True, 'is_superuser': True},
        )

        user.email = email
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f'Superusuário "{username}" criado com sucesso!'))
        else:
            self.stdout.write(self.style.SUCCESS(f'Senha e permissões do superusuário "{username}" foram atualizadas!'))
