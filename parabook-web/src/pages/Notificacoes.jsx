import { useState, useEffect } from 'react';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';

function Notificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const paginaRef = useRevelacao([notificacoes.length, loading]);

  useEffect(() => {
    api.get('/notificacoes/')
      .then(res => setNotificacoes(res.data))
      .catch(err => {
        console.error("Erro ao carregar notificações:", err);
        setErro('Não foi possível carregar suas notificações no momento.');
      })
      .finally(() => setLoading(false));
  }, []);

  const formatarData = (isoString) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    const data = d.toLocaleDateString('pt-BR');
    const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    return `${data} - ${hora}`;
  };

  const marcarComoLida = (id) => {
    const notificacao = notificacoes.find(n => n.id === id);
    if (!notificacao || notificacao.lida) return;

    // Atualização otimista: reflete na hora, desfaz se a API reclamar
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    api.post(`/notificacoes/${id}/lida/`).catch(err => {
      console.error("Erro ao marcar notificação como lida:", err);
      setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: false } : n));
    });
  };

  const marcarTodasComoLidas = () => {
    const idsNaoLidas = notificacoes.filter(n => !n.lida).map(n => n.id);
    if (idsNaoLidas.length === 0) return;

    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    api.post('/notificacoes/marcar_todas_lidas/').catch(err => {
      console.error("Erro ao marcar todas como lidas:", err);
      setNotificacoes(prev => prev.map(n => idsNaoLidas.includes(n.id) ? { ...n, lida: false } : n));
    });
  };

  if (loading) {
    return (
      <div className="container my-5 text-center" style={{ minHeight: '60vh' }}>
        <h2 className="page-lead">Carregando notificações...</h2>
      </div>
    );
  }

  return (
    <div className="container my-5" ref={paginaRef} style={{ minHeight: '60vh' }}>
      <div className="d-flex justify-content-between align-items-center mb-4" data-revelar>
        <h2>Minhas Notificações</h2>
        {notificacoes.length > 0 && (
          <button onClick={marcarTodasComoLidas} className="btn-ghost btn-sm">
            Marcar todas como lidas
          </button>
        )}
      </div>

      {erro && <div className="alert alert-danger">{erro}</div>}

      <div className="list-group notification-list" data-revelar-cascata>
        {notificacoes.length > 0 ? (
          notificacoes.map((n) => (
            <button
              key={n.id}
              data-revelar
              onClick={() => marcarComoLida(n.id)}
              className={`notification-item d-flex justify-content-between align-items-center ${!n.lida ? 'notification-item--unread fw-bold' : ''}`}
            >
              <div>
                <div className="d-flex align-items-center gap-2 mb-1">
                  <h6 className="mb-0">{n.titulo}</h6>
                  <span className="badge bg-secondary notification-type">{n.tipo_display}</span>
                </div>
                <p className="mb-1 fw-normal">{n.mensagem}</p>
                <small>{formatarData(n.data_criacao)}</small>
              </div>
              {!n.lida && (
                <span className="badge bg-danger rounded-pill">Nova</span>
              )}
            </button>
          ))
        ) : (
          !erro && (
            <div className="alert alert-info text-center py-4" data-revelar>
              <i className="fa-solid fa-bell-slash fs-3 mb-2 d-block"></i>
              Você não possui notificações no momento.
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default Notificacoes;
