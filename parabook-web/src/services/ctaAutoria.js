export function obterCtaAutoria(user) {
  if (!user) {
    return { to: '/register', label: 'Criar conta gratuita', icon: 'fa-user-plus' };
  }
  if (user.tipo === 'admin' || user.tipo === 'autor') {
    return { to: '/publicar', label: 'Enviar uma obra', icon: 'fa-file-arrow-up' };
  }
  if (user.tipo === 'aguardando_aprovacao') {
    return { to: '/perfil', label: 'Acompanhar solicitação', icon: 'fa-clock' };
  }
  return { to: '/autor/onboarding', label: 'Solicitar perfil de autor', icon: 'fa-feather' };
}

export function obterCtaSecundariaLanding(user) {
  if (!user) {
    return { to: '/register', label: 'Criar conta gratuita', icon: 'fa-user-plus' };
  }
  if (user.tipo === 'admin' || user.tipo === 'autor') {
    return { to: '/publicar', label: 'Enviar uma obra', icon: 'fa-file-arrow-up' };
  }
  if (user.tipo === 'aguardando_aprovacao') {
    return { to: '/perfil', label: 'Acompanhar solicitação', icon: 'fa-clock' };
  }
  return { to: '/minha-biblioteca', label: 'Abrir minha estante', icon: 'fa-book-bookmark' };
}
