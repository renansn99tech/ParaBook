import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Profile() {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Se ainda estiver checando o localStorage, mostra loading
  if (loading) {
    return <div className="text-center mt-5" style={{ color: 'white' }}>Carregando perfil...</div>;
  }

  // Se a checagem terminou e não tem usuário, barra o acesso
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="profile-container mt-5" style={{ minHeight: '80vh' }}>
      <div className="card shadow-lg border-0 p-5" style={{ background: 'var(--bg-card)', color: 'white' }}>
        <div className="d-flex justify-content-between align-items-start mb-4">
          <h2>Meu Perfil</h2>
          <button className="btn-outline px-4 py-2" onClick={handleLogout} style={{ borderRadius: '12px' }}>
            Sair da Conta
          </button>
        </div>

        <div className="profile-details mt-4">
          <div className="mb-4">
            <h5 style={{ color: 'var(--text-secondary)' }}>Bio</h5>
            <p className="fs-5">{user.bio || "Nenhuma bio informada."}</p>
          </div>
          
          <div className="row mt-5">
            <div className="col-md-4">
              <div className="p-3 border rounded" style={{ borderColor: 'var(--border) !important', background: 'rgba(255,255,255,0.02)' }}>
                <span className="d-block text-muted mb-1 text-uppercase small">Localização</span>
                <strong>{user.localizacao || "Não informada"}</strong>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="p-3 border rounded" style={{ borderColor: 'var(--border) !important', background: 'rgba(255,255,255,0.02)' }}>
                <span className="d-block text-muted mb-1 text-uppercase small">Gêneros Favoritos</span>
                <strong>{user.generos_favoritos || "Não informados"}</strong>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="p-3 border rounded" style={{ borderColor: 'var(--border) !important', background: 'rgba(255,255,255,0.02)' }}>
                <span className="d-block text-muted mb-1 text-uppercase small">Privacidade</span>
                <strong>{user.is_private ? "Conta Privada" : "Conta Pública"}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;
