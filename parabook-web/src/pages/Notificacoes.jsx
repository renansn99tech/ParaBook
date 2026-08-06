import { useState } from 'react';
import { Link } from 'react-router-dom';

function Notificacoes() {
  // Mock data explícito para a interface
  const [notificacoes, setNotificacoes] = useState([
    {
      id: 1,
      titulo: 'Bem-vindo ao ParaBook!',
      tipo_display: 'Sistema',
      mensagem: 'Explore nossa biblioteca e publique suas histórias.',
      data_criacao: '05/08/2026 - 10:00',
      lida: false
    },
    {
      id: 2,
      titulo: 'Novo comentário',
      tipo_display: 'Interação',
      mensagem: 'João comentou no seu livro "A Jornada".',
      data_criacao: '04/08/2026 - 15:30',
      lida: true
    }
  ]);

  const marcarComoLida = (id) => {
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
  };

  const marcarTodasComoLidas = () => {
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
  };

  return (
    <div className="container my-5" style={{ minHeight: '60vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          Minhas Notificações 
          <span className="badge bg-warning text-dark fs-6 ms-2 align-middle" title="Dados Fictícios (Mock)">Mock</span>
        </h2>
        {notificacoes.length > 0 && (
          <button onClick={marcarTodasComoLidas} className="btn btn-sm btn-outline-secondary">
            Marcar todas como lidas
          </button>
        )}
      </div>

      <div className="list-group shadow-sm">
        {notificacoes.length > 0 ? (
          notificacoes.map((n) => (
            <button 
              key={n.id}
              onClick={() => marcarComoLida(n.id)}
              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3 border-secondary border-opacity-25 ${!n.lida ? 'fw-bold' : ''}`}
              style={{ 
                textAlign: 'left', 
                cursor: 'pointer',
                background: !n.lida ? 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)' : '#12131C',
                color: '#fff'
              }}
            >
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <h6 className="mb-0 text-white">{n.titulo}</h6>
                  <span className="badge bg-secondary" style={{ fontSize: '0.7rem' }}>{n.tipo_display}</span>
                </div>
                <p className="mb-1 text-muted fw-normal" style={{ fontSize: '0.95rem' }}>{n.mensagem}</p>
                <small className="text-muted" style={{ fontSize: '0.8rem' }}>{n.data_criacao}</small>
              </div>
              {!n.lida && (
                <span className="badge bg-danger rounded-pill">Nova</span>
              )}
            </button>
          ))
        ) : (
          <div className="alert alert-info text-center py-4">
            <i className="fa-solid fa-bell-slash fs-3 mb-2 d-block"></i>
            Você não possui notificações no momento.
          </div>
        )}
      </div>
    </div>
  );
}

export default Notificacoes;
