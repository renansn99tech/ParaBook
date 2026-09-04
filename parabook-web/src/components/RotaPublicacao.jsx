import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';

function RotaPublicacao({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <main className="home-loading" role="status">Verificando acesso à publicação...</main>;
  }
  if (!user) {
    return <Navigate to="/para-autores" replace />;
  }
  if (user.tipo === 'aguardando_aprovacao') {
    return <Navigate to="/perfil" replace />;
  }
  if (user.tipo !== 'autor' && user.tipo !== 'admin') {
    return <Navigate to="/para-autores" replace />;
  }
  return children;
}

export default RotaPublicacao;
