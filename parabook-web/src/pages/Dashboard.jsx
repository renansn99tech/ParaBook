import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import '../assets/css/admin.css';

// Componentes das Abas
import AdminLivros from '../components/admin/AdminLivros';
import AdminComunidades from '../components/admin/AdminComunidades';
import AdminUsuarios from '../components/admin/AdminUsuarios';
import AdminAprovacoes from '../components/admin/AdminAprovacoes';
import AdminDenuncias from '../components/admin/AdminDenuncias';
import AdminLixeira from '../components/admin/AdminLixeira';

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [abaAtiva, setAbaAtiva] = useState('dashboard');
  const [metricas, setMetricas] = useState({
    total_usuarios: 0,
    total_comunidades: 0,
    total_livros: 0,
  });

  useEffect(() => {
    if (abaAtiva === 'dashboard') {
      api.get('/dashboard/estatisticas/')
        .then(res => setMetricas(res.data.estatisticas))
        .catch(err => console.error("Erro ao carregar estatísticas do dashboard", err));
    }
  }, [abaAtiva]);

  const menu = [
    { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
    { id: 'livros', icon: 'fa-book', label: 'Livros' },
    { id: 'comunidades', icon: 'fa-users', label: 'Comunidades' },
    { id: 'usuarios', icon: 'fa-user-group', label: 'Usuários' },
    { id: 'aprovacoes', icon: 'fa-clipboard-check', label: 'Aprovações' },
    { id: 'denuncias', icon: 'fa-flag', label: 'Denúncias', warning: true },
    { id: 'lixeira', icon: 'fa-trash-can', label: 'Lixeira', danger: true }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-container" style={{ display: 'flex', minHeight: '100vh', margin: 0, padding: 0 }}>
      
      {/* SIDEBAR NAV */}
      <aside className="admin-sidebar">
        <div className="brand-logo-admin" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
          <i className="fa-solid fa-book-open-reader" style={{ fontSize: '1.8rem', color: '#8b5cf6' }}></i>
          <h2 style={{ margin: 0, color: 'white' }}>Para<span style={{ color: '#8b5cf6' }}>Book</span></h2>
        </div>

        {menu.map(item => (
          <button 
            key={item.id}
            className={`${abaAtiva === item.id ? 'active' : ''} ${item.danger ? 'danger text-danger' : ''} ${item.warning ? 'warning text-warning' : ''}`}
            onClick={() => setAbaAtiva(item.id)}
            style={{
              ...(item.danger && abaAtiva !== item.id ? { color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' } : {}),
              ...(item.warning && abaAtiva !== item.id ? { color: '#f97316', borderColor: 'rgba(249, 115, 22, 0.2)' } : {})
            }}
          >
            <i className={`fa-solid ${item.icon}`} style={{ width: '25px' }}></i> {item.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <Link to={`/perfil/${user?.username}`} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', background: 'transparent', color: '#94a3b8', border: 'none', padding: '12px 15px', textDecoration: 'none', borderRadius: '8px' }} className="hover-btn">
            <i className="fa-solid fa-user" style={{ width: '20px', textAlign: 'center' }}></i> Meu Perfil
          </Link>
          <Link to="/" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', background: 'transparent', color: '#94a3b8', border: 'none', padding: '12px 15px', textDecoration: 'none', borderRadius: '8px' }} className="hover-btn">
            <i className="fa-solid fa-house" style={{ width: '20px', textAlign: 'center' }}></i> Página Inicial
          </Link>
          <button className="danger" onClick={handleLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', padding: '12px 15px', borderRadius: '8px' }}>
            <i className="fa-solid fa-right-from-bracket" style={{ width: '20px', textAlign: 'center' }}></i> Sair
          </button>
        </div>
      </aside>

      {/* MAIN INTERFACE */}
      <main className="admin-main">
        
        {abaAtiva === 'dashboard' && (
          <section className="secao" style={{ display: 'block' }}>
            <h1 style={{ color: 'white', marginBottom: '20px' }}>Visão Geral</h1>
            
            {/* Sem grid inline: o admin.css já define auto-fit no desktop e
                1 coluna no mobile, e o inline anulava esse comportamento. */}
            <div className="metricas-grid">
              <div className="card">
                <h3>Total de Usuários</h3>
                <p>{metricas.total_usuarios}</p>
              </div>
              <div className="card">
                <h3>Total de Livros</h3>
                <p>{metricas.total_livros}</p>
              </div>
              <div className="card">
                <h3>Comunidades Ativas</h3>
                <p>{metricas.total_comunidades}</p>
              </div>
              <div className="card">
                <h3>Alertas do Sistema</h3>
                <p style={{ color: '#eab308' }}>0</p>
              </div>
            </div>
          </section>
        )}

        {abaAtiva === 'livros' && <AdminLivros />}
        {abaAtiva === 'comunidades' && <AdminComunidades />}
        {abaAtiva === 'usuarios' && <AdminUsuarios />}
        {abaAtiva === 'aprovacoes' && <AdminAprovacoes />}
        {abaAtiva === 'denuncias' && <AdminDenuncias setAbaAtiva={setAbaAtiva} />}
        {abaAtiva === 'lixeira' && <AdminLixeira />}

      </main>
    </div>
  );
}

export default Dashboard;
