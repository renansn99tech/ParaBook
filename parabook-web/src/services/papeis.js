export const ehModerador = (user) => Boolean(
  user
  && ['moderador', 'admin'].includes(user.tipo)
  && (user.is_staff || user.is_superuser)
);

export const rotuloPapel = (user) => {
  if (user?.is_superuser || user?.tipo === 'admin') return 'Administrador';
  if (user?.tipo === 'moderador') return 'Moderador';
  if (user?.tipo === 'autor') return 'Autor';
  if (user?.tipo === 'aguardando_aprovacao') return 'Autoria em análise';
  return 'Leitor';
};
