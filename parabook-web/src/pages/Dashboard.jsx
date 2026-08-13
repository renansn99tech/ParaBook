import { useContext, useState, useEffect } from 'react';
import { AuthContext } from '../context/auth-context';
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
    <div className="admin-container">

      {/* SIDEBAR NAV */}
      <aside className="admin-sidebar">
        <div className="brand-logo-admin">
          <i className="fa-solid fa-book-open-reader"></i>
          <h2>Para<span>Book</span></h2>
        </div>

        {/* As cores de "perigo" e "aviso" do item inativo vinham por estilo
            inline, duplicando o que .admin-sidebar .danger/.warning já faz
            no CSS — e vencendo por especificidade, o que travava o estado
            ativo desses dois itens. A classe sozinha resolve. */}
        {menu.map(item => (
          <button
            key={item.id}
            className={`${abaAtiva === item.id ? 'active' : ''} ${item.danger ? 'danger' : ''} ${item.warning ? 'warning' : ''}`}
            onClick={() => setAbaAtiva(item.id)}
          >
            <i className={`fa-solid ${item.icon}`}></i> {item.label}
          </button>
        ))}

        <div className="admin-sidebar-rodape">
          <Link to={`/perfil/${user?.username}`}>
            <i className="fa-solid fa-user"></i> Meu Perfil
          </Link>
          <Link to="/">
            <i className="fa-solid fa-house"></i> Página Inicial
          </Link>
          <button className="danger" onClick={handleLogout}>
            <i className="fa-solid fa-right-from-bracket"></i> Sair
          </button>
        </div>
      </aside>

      {/* MAIN INTERFACE */}
      <main className="admin-main">
        
        {abaAtiva === 'dashboard' && (
          <section className="secao">
            <h1>Visão Geral</h1>
            
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
                <p className="alerta-zero">0</p>
              </div>
            </div>
          </section>
        )}

        {abaAtiva === 'livros' && <AdminLivros />}
        {abaAtiva === 'comunidades' && <AdminComunidades />}
        {abaAtiva === 'usuarios' && <AdminUsuarios />}
        {abaAtiva === 'aprovacoes' && <AdminAprovacoes />}
        {abaAtiva === 'denuncias' && <AdminDenuncias />}
        {abaAtiva === 'lixeira' && <AdminLixeira />}

      </main>
    </div>
  );
}

export default Dashboard;
