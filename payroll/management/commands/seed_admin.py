import os

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.exceptions import FieldDoesNotExist
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from perfis.models import Perfil
from usuarios.models import Usuario


class Command(BaseCommand):
    help = 'Cria ou atualiza, de forma idempotente, o superusuário inicial.'

    def handle(self, *args, **options):
        UserModel = get_user_model()
        username_field = UserModel.USERNAME_FIELD
        email_field = getattr(UserModel, 'EMAIL_FIELD', 'email')

        configured_username = os.getenv('SEED_ADMIN_USERNAME', '').strip()
        configured_email = os.getenv('SEED_ADMIN_EMAIL', '').strip().lower()
        password = os.getenv('SEED_ADMIN_PASSWORD', '')

        if not password:
            self.stdout.write(
                self.style.WARNING(
                    'SEED_ADMIN_PASSWORD não configurada; seed_admin ignorado '
                    'para evitar criar ou atualizar uma senha previsível.'
                )
            )
            return

        identifier = self._admin_identifier(
            UserModel,
            username_field,
            email_field,
            configured_username,
            configured_email,
        )
        if not identifier:
            self.stdout.write(
                self.style.WARNING(
                    f'SEED_ADMIN_USERNAME não configurada; seed_admin ignorado. '
                    f'O modelo {UserModel._meta.label} autentica por {username_field}.'
                )
            )
            return

        with transaction.atomic():
            user = self._find_existing_user(
                UserModel,
                username_field,
                email_field,
                identifier,
                configured_email,
            )
            if user is False:
                return
            created = user is None
            if created:
                user = UserModel()

            identifier = self._safe_identifier(
                UserModel,
                user,
                username_field,
                identifier,
                created,
            )
            setattr(user, username_field, identifier)
            self._set_if_field_exists(user, email_field, configured_email)
            self._set_if_field_exists(user, 'is_active', True)
            self._set_if_field_exists(user, 'is_staff', True)
            self._set_if_field_exists(user, 'is_superuser', True)
            user.set_password(password)
            user.save()

            self._ensure_parabook_admin_profile(user)

        public_identifier = getattr(user, username_field)
        action = 'criado' if created else 'atualizado'
        self.stdout.write(
            self.style.SUCCESS(
                f'Superusuário "{public_identifier}" {action} com sucesso.'
            )
        )

    def _admin_identifier(
        self,
        UserModel,
        username_field,
        email_field,
        configured_username,
        configured_email,
    ):
        if username_field == email_field:
            return configured_email or configured_username
        if configured_username:
            return configured_username
        if configured_email:
            try:
                field = UserModel._meta.get_field(username_field)
            except FieldDoesNotExist:
                return ''
            max_length = getattr(field, 'max_length', None)
            if max_length is None or len(configured_email) <= max_length:
                return configured_email
        return ''

    def _find_existing_user(
        self,
        UserModel,
        username_field,
        email_field,
        identifier,
        configured_email,
    ):
        user = UserModel._default_manager.filter(
            **{f'{username_field}__iexact': identifier}
        ).first()
        if user or not configured_email or email_field == username_field:
            return user

        try:
            UserModel._meta.get_field(email_field)
        except FieldDoesNotExist:
            return None

        matches = list(
            UserModel._default_manager.filter(
                **{f'{email_field}__iexact': configured_email}
            ).order_by('pk')[:2]
        )
        if len(matches) == 1:
            return matches[0]
        if len(matches) > 1:
            self.stdout.write(
                self.style.WARNING(
                    'Mais de um usuário encontrado com SEED_ADMIN_EMAIL; '
                    'nenhuma conta foi alterada para evitar ambiguidade.'
                )
            )
            return False
        return None

    def _set_if_field_exists(self, instance, field_name, value):
        if value in (None, ''):
            return
        try:
            instance._meta.get_field(field_name)
        except FieldDoesNotExist:
            return
        setattr(instance, field_name, value)

    def _safe_identifier(self, UserModel, user, username_field, identifier, created):
        if created:
            return identifier
        current = getattr(user, username_field)
        if str(current).lower() == str(identifier).lower():
            return identifier
        conflict = UserModel._default_manager.filter(
            **{f'{username_field}__iexact': identifier}
        ).exclude(pk=user.pk).exists()
        if conflict:
            self.stdout.write(
                self.style.WARNING(
                    f'{username_field} "{identifier}" já pertence a outro usuário; '
                    f'mantendo "{current}" na conta administrativa encontrada.'
                )
            )
            return current
        return identifier

    def _ensure_parabook_admin_profile(self, user):
        perfil, _ = Perfil.objects.get_or_create(
            usuario=user,
            defaults={'descricao_perfil': 'Administrador do Sistema'},
        )
        usuario, created = Usuario.objects.get_or_create(
            user_auth=user,
            defaults={
                'nome': user.get_full_name() or user.get_username(),
                'tipo': 'admin',
                'perfil': perfil,
                'termos_aceitos': True,
                'data_aceite_termos': timezone.now(),
                'versao_termos_aceita': settings.TERMS_VERSION,
            },
        )
        update_fields = []
        if usuario.tipo != 'admin':
            usuario.tipo = 'admin'
            update_fields.append('tipo')
        if usuario.perfil_id != perfil.pk:
            usuario.perfil = perfil
            update_fields.append('perfil')
        if not usuario.termos_aceitos:
            usuario.termos_aceitos = True
            usuario.data_aceite_termos = timezone.now()
            update_fields.extend(['termos_aceitos', 'data_aceite_termos'])
        if usuario.versao_termos_aceita != settings.TERMS_VERSION:
            usuario.versao_termos_aceita = settings.TERMS_VERSION
            update_fields.append('versao_termos_aceita')
        if update_fields and not created:
            usuario.save(update_fields=update_fields)
