import { useEffect, useState } from 'react';
import api from '../../services/api';

function AdminSuporte({ onNotificar }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [resposta, setResposta] = useState('');
  const carregar = () => api.get('/dashboard/suporte/').then((r) => setItens(r.data)).finally(() => setCarregando(false));
  useEffect(() => { carregar(); }, []);
  const responder = async (evento) => {
    evento.preventDefault();
    await api.patch(`/dashboard/suporte/${selecionado.id}/`, { resposta, status: 'respondida' });
    setSelecionado(null); setResposta(''); await carregar(); onNotificar?.('Resposta registrada no protocolo.');
  };
  return <section className="secao"><h1>Suporte de conta</h1><p className="admin-subtitulo">Canal interno disponível inclusive para contas temporariamente suspensas.</p><div className="admin-panel">{carregando ? <p>Carregando...</p> : itens.length ? <ul className="central-conta-lista">{itens.map((item) => <li key={item.id}><span><strong>{item.assunto}</strong><small>@{item.username} · {item.protocolo} · {item.status}</small><p>{item.mensagem}</p>{item.resposta && <p><b>Resposta:</b> {item.resposta}</p>}</span>{!['respondida', 'encerrada'].includes(item.status) && <button type="button" className="btn-outline" onClick={() => setSelecionado(item)}>Responder</button>}</li>)}</ul> : <p>Nenhuma solicitação aberta.</p>}</div>{selecionado && <div className="admin-modal-backdrop"><section className="admin-modal-governanca" role="dialog" aria-modal="true"><header><div><span>Protocolo {selecionado.protocolo}</span><h2>Responder @{selecionado.username}</h2></div><button type="button" onClick={() => setSelecionado(null)} aria-label="Fechar"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button></header><form onSubmit={responder}><label>Resposta<textarea value={resposta} onChange={(e) => setResposta(e.target.value)} minLength="10" maxLength="4000" required /></label><footer><button type="button" className="btn-outline" onClick={() => setSelecionado(null)}>Cancelar</button><button type="submit" className="btn-primary-action">Registrar resposta</button></footer></form></section></div>}</section>;
}

export default AdminSuporte;
