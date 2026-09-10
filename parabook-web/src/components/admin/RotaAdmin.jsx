import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/auth-context';
import { ehModerador } from '../../services/papeis';

function RotaAdmin({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <main className="admin-rota-carregando" role="status">Validando acesso administrativo...</main>;
  }
  if (!user) return <Navigate to="/login" replace />;

  const autorizado = ehModerador(user);
  if (!autorizado) return <Navigate to="/perfil" replace />;

  return children;
}

export default RotaAdmin;
