import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/auth-context';

function RotaAdmin({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <main className="admin-rota-carregando" role="status">Validando acesso administrativo...</main>;
  }
  if (!user) return <Navigate to="/login" replace />;

  const autorizado = user.tipo === 'admin' && Boolean(user.is_staff || user.is_superuser);
  if (!autorizado) return <Navigate to="/perfil" replace />;

  return children;
}

export default RotaAdmin;
