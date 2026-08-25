import avatarLeitor from '../assets/img/avatar-padrao-parabook.webp';
import avatarAdmin from '../assets/img/avatar-padrao-admin-parabook.webp';
import avatarAutor from '../assets/img/avatar-padrao-autor-parabook.webp';

export function obterAvatarPadrao(usuario) {
  if (usuario?.tipo === 'admin' || usuario?.is_superuser) return avatarAdmin;
  if (usuario?.tipo === 'autor') return avatarAutor;
  return avatarLeitor;
}

export function obterAvatarPerfil(usuario, fotoPreferencial) {
  return fotoPreferencial || usuario?.foto || obterAvatarPadrao(usuario);
}
