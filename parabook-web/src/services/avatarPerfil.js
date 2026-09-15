import avatarLeitor from '../assets/img/avatar-padrao-parabook.webp';
import avatarAdmin from '../assets/img/avatar-padrao-admin-parabook.webp';
import avatarAutor from '../assets/img/avatar-padrao-autor-parabook.webp';

export function obterAvatarPadrao(usuario) {
<<<<<<< HEAD
  if (usuario?.tipo === 'admin' || usuario?.is_superuser) return avatarAdmin;
=======
  if (['moderador', 'admin'].includes(usuario?.tipo) || usuario?.is_superuser) return avatarAdmin;
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9
  if (usuario?.tipo === 'autor') return avatarAutor;
  return avatarLeitor;
}

export function obterAvatarPerfil(usuario, fotoPreferencial) {
  return fotoPreferencial || usuario?.foto || obterAvatarPadrao(usuario);
}
