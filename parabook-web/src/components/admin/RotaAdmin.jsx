import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../../context/auth-context';
<<<<<<< HEAD
=======
import { ehModerador } from '../../services/papeis';
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9

function RotaAdmin({ children }) {
  const { user, loading } = useContext(AuthContext);

  if (loading) {
    return <main className="admin-rota-carregando" role="status">Validando acesso administrativo...</main>;
  }
  if (!user) return <Navigate to="/login" replace />;

<<<<<<< HEAD
  const autorizado = user.tipo === 'admin' && Boolean(user.is_staff || user.is_superuser);
=======
  const autorizado = ehModerador(user);
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9
  if (!autorizado) return <Navigate to="/perfil" replace />;

  return children;
}

export default RotaAdmin;
