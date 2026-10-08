import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

function AdminSuporte({ onNotificar }) {
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [selecionado, setSelecionado] = useState(null);
  const [resposta, setResposta] = useState('');
  const [senha, setSenha] = useState('');
  const [acao, setAcao] = useState('iniciar');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);
  const tentativa = useRef(null);
  const dialogo = useRef(null);
  useEffect(() => {
    if (!selecionado) return;
    const anterior = document.activeElement;
    dialogo.current?.querySelector('select, textarea')?.focus();
    return () => { anterior?.focus(); };
  }, [selecionado]);
  const carregar = () => api.get('/dashboard/suporte/').then((r) => setItens(r.data)).finally(() => setCarregando(false));
  useEffect(() => { carregar().catch(() => setErro('Não foi possível carregar o suporte.')); }, []);
  const fechar = () => { setSelecionado(null); setSenha(''); setResposta(''); tentativa.current = null; };
  const responder = async (evento) => {
    evento.preventDefault();
    if (enviando) return;
    setEnviando(true); setErro('');
    try {
      if (selecionado.categoria === 'idade') {
        tentativa.current ||= crypto.randomUUID();
        await api.post(`/dashboard/suporte/${selecionado.id}/idade/`, {
          acao, resposta, senha_atual: senha, chave_idempotencia: tentativa.current,
        });
      } else {
        await api.patch(`/dashboard/suporte/${selecionado.id}/`, { resposta, status: 'respondida' });
      }
      fechar(); await carregar(); onNotificar?.('Resposta registrada no protocolo.');
    } catch (falha) {
      setErro(Object.values(falha.response?.data || {}).flat().filter((valor) => typeof valor === 'string').join(' ') || 'Não foi possível registrar a resposta.');
    } finally { setEnviando(false); }
  };
  return <section className="secao">
    <h1>Suporte de conta</h1><p className="admin-subtitulo">Revisões de idade usam a declaração atual, sem documentos ou edição administrativa da data. Suspensões e outros impedimentos permanecem.</p>
    {erro && !selecionado && <p role="alert">{erro}</p>}
    <div className="admin-panel">{carregando ? <p>Carregando...</p> : itens.length ? <ul className="central-conta-lista">{itens.map((item) => <li key={item.id}>
      <span><strong>{item.assunto}</strong><small>@{item.username} · {item.protocolo} · {item.status}</small><p>{item.mensagem}</p>{item.resposta && <p><b>Resposta:</b> {item.resposta}</p>}</span>
      {!['respondida', 'encerrada'].includes(item.status) && <button type="button" className="btn-outline" onClick={() => {
        setSelecionado(item); setErro(''); setAcao(item.idade_em_revisao ? 'confirmar_declaracao' : 'iniciar');
      }}>{item.categoria === 'idade' ? 'Analisar idade' : 'Responder'}</button>}
    </li>)}</ul> : <p>Nenhuma solicitação.</p>}</div>
    {selecionado && <div className="admin-modal-backdrop"><section ref={dialogo} className="admin-modal-governanca" role="dialog" aria-modal="true" aria-labelledby="suporte-dialogo-titulo" onKeyDown={(evento) => {
      if (evento.key === 'Escape' && !enviando) { evento.preventDefault(); fechar(); }
      if (evento.key !== 'Tab') return;
      const focaveis = Array.from(dialogo.current.querySelectorAll('button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled)'));
      const primeiro = focaveis[0]; const ultimo = focaveis.at(-1);
      if (evento.shiftKey && document.activeElement === primeiro) { evento.preventDefault(); ultimo?.focus(); }
      else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primeiro?.focus(); }
    }}>
      <header><div><span>Protocolo {selecionado.protocolo}</span><h2 id="suporte-dialogo-titulo">Responder @{selecionado.username}</h2></div><button type="button" disabled={enviando} onClick={fechar} aria-label="Fechar">×</button></header>
      <form onSubmit={responder}>
        {selecionado.categoria === 'idade' && <>
          <label>Ação<select value={acao} disabled={enviando} onChange={(e) => { tentativa.current = null; setAcao(e.target.value); }}>
            {!selecionado.idade_em_revisao ? <option value="iniciar">Iniciar análise (Modo Restrito)</option> : <><option value="confirmar_declaracao">Concluir pela declaração atual</option><option value="orientar_correcao">Concluir com orientação de correção</option></>}
          </select></label>
          <p>A conclusão calcula a faixa a partir da declaração privada. Sem declaração, oriente o titular. O prazo e o contador de correções permanecem.</p>
          <label>Senha atual<input type="password" autoComplete="current-password" value={senha} disabled={enviando} onChange={(e) => setSenha(e.target.value)} required /></label>
        </>}
        <label>Resposta e motivo<textarea value={resposta} disabled={enviando} onChange={(e) => { tentativa.current = null; setResposta(e.target.value); }} minLength={selecionado.categoria === 'idade' ? 20 : 10} maxLength={4000} required /></label>
        {erro && <p role="alert">{erro}</p>}
        <footer><button type="button" className="btn-outline" disabled={enviando} onClick={fechar}>Cancelar</button><button type="submit" className="btn-primary-action" disabled={enviando}>Registrar resposta</button></footer>
      </form>
    </section></div>}
  </section>;
}

export default AdminSuporte;
