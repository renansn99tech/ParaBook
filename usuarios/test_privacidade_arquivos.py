from django.contrib.auth.models import User
from django.core.files.base import ContentFile
from django.test import TestCase
from rest_framework.exceptions import NotFound, PermissionDenied

from perfis.models import Perfil
from usuarios.privacidade_arquivos import abrir_arquivo_proprio


class ArquivosPropriosTests(TestCase):
    def test_copia_assistida_confere_dono_campo_e_estado_atual(self):
        dono = User.objects.create_user(username='arquivo-proprio-sintetico')
        outro = User.objects.create_user(username='arquivo-alheio-sintetico')
        perfil = Perfil.objects.create(usuario=dono)
        perfil.foto.save('foto-sintetica.png', ContentFile(b'bytes-proprios'))
        with abrir_arquivo_proprio(titular=dono, tipo='perfil', recurso_id=perfil.pk, campo='foto') as arquivo:
            self.assertEqual(arquivo.read(), b'bytes-proprios')
        for ator, campo in ((outro, 'foto'), (dono, '../foto'), (dono, 'password')):
            with self.subTest(campo=campo):
                with self.assertRaises(NotFound):
                    abrir_arquivo_proprio(titular=ator, tipo='perfil', recurso_id=perfil.pk, campo=campo)
        User.objects.filter(pk=dono.pk).update(is_active=False)
        with self.assertRaises(PermissionDenied):
            abrir_arquivo_proprio(titular=dono, tipo='perfil', recurso_id=perfil.pk, campo='foto')
