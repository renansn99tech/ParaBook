import { useContext, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../assets/css/admin.css';

function Dashboard() {
  const { user, logout } = useContext(AuthContext);
  const [abaAtiva, setAbaAtiva] = useState('dashboard');

  // Mocks de Dashboard
  const metricas = {
    usuarios: 15,
    livros: 42,
    autores: 5,
    pendentes: 2
  };

  const menu = [
    { id: 'dashboard', icon: 'fa-chart-line', label: 'Dashboard' },
    { id: 'livros', icon: 'fa-book', label: 'Livros' },
    { id: 'comunidades', icon: 'fa-users', label: 'Comunidades' },
    { id: 'usuarios', icon: 'fa-user-group', label: 'Usuários' }
  ];

  return (
    <div className="admin-container" style={{ display: 'flex', minHeight: '80vh', marginTop: '20px', borderRadius: '12px', overflow: 'hidden' }}>
      
      {/* SIDEBAR NAV */}
      <aside className="admin-sidebar">
        <div className="brand-logo-admin" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '30px' }}>
          <i className="fa-solid fa-book-open-reader" style={{ fontSize: '1.8rem', color: '#8b5cf6' }}></i>
          <h2 style={{ margin: 0, color: 'white' }}>Para<span style={{ color: '#8b5cf6' }}>Book</span></h2>
        </div>

        {menu.map(item => (
          <button 
            key={item.id}
            className={abaAtiva === item.id ? 'active' : ''}
            onClick={() => setAbaAtiva(item.id)}
          >
            <i className={`fa-solid ${item.icon}`} style={{ width: '25px' }}></i> {item.label}
          </button>
        ))}

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '20px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
          <button className="danger" onClick={logout} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '12px', padding: '12px 16px' }}>
            <i className="fa-solid fa-right-from-bracket" style={{ width: '20px', textAlign: 'center' }}></i> Sair
          </button>
        </div>
      </aside>

      {/* MAIN INTERFACE */}
      <main className="admin-main">
        
        {abaAtiva === 'dashboard' && (
          <section className="secao" style={{ display: 'block' }}>
            <h1 style={{ color: 'white', marginBottom: '20px' }}>Visão Geral</h1>
            
            <div className="metricas-grid">
              <div className="card">
                <h3>Total de Usuários</h3>
                <p>{metricas.usuarios}</p>
              </div>
              <div className="card">
                <h3>Livros Publicados</h3>
                <p style={{ color: '#22c55e' }}>{metricas.livros}</p>
              </div>
              <div className="card">
                <h3>Autores Ativos</h3>
                <p>{metricas.autores}</p>
              </div>
              <div className="card">
                <h3>Solicitações Pendentes</h3>
                <p style={{ color: '#eab308' }}>{metricas.pendentes}</p>
              </div>
            </div>
            
            <div className="mt-5 p-4 rounded" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)' }}>
              <h3 className="text-white mb-3">Gráficos e Relatórios</h3>
              <p className="text-muted">A integração com os gráficos de relatórios será implementada na Fase 5.</p>
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
