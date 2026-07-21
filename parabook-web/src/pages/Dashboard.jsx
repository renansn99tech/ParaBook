import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../assets/css/admin.css';

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  const metricas = {
    usuarios: 1,
    livros: 0,
    autores: 0,
    livros_publicados: 0,
    pendentes: 0
  };

  const menu = [
    { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
    { id: 'livros', icon: 'fa-book', label: 'Livros' },
    { id: 'comunidades', icon: 'fa-users', label: 'Comunidades' },
    { id: 'usuarios', icon: 'fa-user-group', label: 'Usuários' },
    { id: 'aprovacoes', icon: 'fa-clipboard-check', label: 'Aprovações' },
    { id: 'denuncias', icon: 'fa-flag', label: 'Denúncias', danger: true }
  ];

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
            className={`${abaAtiva === item.id ? 'active' : ''} ${item.danger ? 'danger text-danger' : ''}`}
            onClick={() => setAbaAtiva(item.id)}
            style={item.danger && abaAtiva !== item.id ? { color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' } : {}}
          >
            <i className={`fa-solid ${item.icon}`} style={{ width: '25px' }}></i> {item.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px' }}>
            <i className="fa-solid fa-user" style={{ width: '20px', textAlign: 'center' }}></i> Meu Perfil
          </button>
          <button style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px' }}>
            <i className="fa-solid fa-desktop" style={{ width: '20px', textAlign: 'center' }}></i> Visão Leitor
          </button>
          <button className="danger" onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px' }}>
            <i className="fa-solid fa-right-from-bracket" style={{ width: '20px', textAlign: 'center' }}></i> Sair
          </button>
        </div>
      </aside>

      {/* MAIN INTERFACE */}
      <main className="admin-main">
        
        {abaAtiva === 'dashboard' && (
          <section className="secao" style={{ display: 'block' }}>
            <h1 style={{ color: 'white', marginBottom: '20px' }}>Visão Geral</h1>
            
            <div className="metricas-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px' }}>
              <div className="card">
                <h3>Total de Usuários</h3>
                <p>{metricas.usuarios}</p>
              </div>
              <div className="card">
                <h3>Total de Livros</h3>
                <p>{metricas.livros}</p>
              </div>
              <div className="card">
                <h3>Autores Ativos</h3>
                <p>{metricas.autores}</p>
              </div>
              <div className="card">
                <h3>Livros Publicados</h3>
                <p style={{ color: '#22c55e' }}>{metricas.livros_publicados}</p>
              </div>
              <div className="card">
                <h3>Solicitações Pendentes</h3>
                <p style={{ color: '#eab308' }}>{metricas.pendentes}</p>
              </div>
            </div>
            
            <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', height: '300px' }}>
              <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></div>
              <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></div>
              <div style={{ background: '#1e293b', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}></div>
            </div>
          </section>
        )}

        {abaAtiva !== 'dashboard' && (
          <section className="secao" style={{ display: 'block' }}>
            <h1 style={{ color: 'white', marginBottom: '20px', textTransform: 'capitalize' }}>Gerenciar {abaAtiva}</h1>
            <p className="text-muted">Painel de gerenciamento de {abaAtiva} (Em desenvolvimento).</p>
          </section>
        )}

      </main>
    </div>
  );
}

export default Dashboard;
