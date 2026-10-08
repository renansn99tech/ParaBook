import { useContext, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import '../assets/css/moderacao.css';

const CATEGORIAS = [
  ['protecao_infantojuvenil', 'Segurança de criança ou adolescente'], ['conteudo_ilegal', 'Conteúdo ilegal'],
  ['privacidade', 'Privacidade'], ['direitos_autorais', 'Direitos autorais'], ['assedio_abuso', 'Assédio ou abuso'],
  ['conta_comprometida', 'Conta comprometida'], ['falha_seguranca', 'Falha de segurança'],
];
const erroLegivel = (erro) => Object.values(erro.response?.data || {}).flat().filter((v) => typeof v === 'string').join(' ') || 'Não foi possível concluir. Preserve o código e tente novamente.';
const dataLegivel = (data) => data ? new Date(data).toLocaleString('pt-BR') : 'Pendente';

function EstadoProtocolo({ caso }) {
  return <article className="g3-protocolo">
    <h3>Protocolo {caso.protocolo}</h3><p>Estado: {caso.estado.replaceAll('_', ' ')}</p>
    <dl><dt>Recebimento automático</dt><dd>{dataLegivel(caso.recebido_em)}</dd><dt>Confirmação humana</dt><dd>{dataLegivel(caso.confirmado_em)}</dd><dt>Decisão</dt><dd>{dataLegivel(caso.decidido_em)}</dd></dl>
    {caso.resposta ? <p className="g3-resposta">{caso.resposta}</p> : <p>Ainda não há resposta disponível neste protocolo.</p>}
    {caso.encerrado_em && <p>Encerrado em {dataLegivel(caso.encerrado_em)}</p>}
  </article>;
}

function MeusCasos() {
  const [casos, setCasos] = useState([]);
  const [erro, setErro] = useState('');
  const [selecionado, setSelecionado] = useState('');
  const [fundamento, setFundamento] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const tentativa = useRef(null);
  const carregar = () => api.get('/auth/moderacao/').then((r) => setCasos(r.data));
  useEffect(() => { carregar().catch((e) => setErro(erroLegivel(e))); }, []);
  const recorrer = async (e) => {
    e.preventDefault(); if (ocupado) return;
    setOcupado(true); setErro(''); tentativa.current ||= crypto.randomUUID();
    try {
      await api.post('/auth/moderacao/', { protocolo: selecionado, fundamento, chave_idempotencia: tentativa.current });
      setSelecionado(''); setFundamento(''); tentativa.current = null; await carregar();
    } catch (falha) { setErro(erroLegivel(falha)); } finally { setOcupado(false); }
  };
  return <section id="meus" className="g3-card"><h2>Meus atendimentos e recursos</h2>
    <p>Recursos de suspensão de conta e remoção definitiva são acompanhados aqui. Publicação mantém o <Link to="/minhas-publicacoes">rito próprio do autor</Link>.</p>
    <button type="button" onClick={() => carregar().catch((e) => setErro(erroLegivel(e)))}>Atualizar atendimentos</button>
    {erro && <p role="alert">{erro}</p>}
    {casos.length ? casos.map((caso) => <div key={caso.protocolo}><EstadoProtocolo caso={caso} />{caso.pode_recorrer && <button type="button" onClick={() => { setSelecionado(caso.protocolo); tentativa.current = null; }}>Apresentar recurso</button>}</div>) : <p>Nenhum caso localizado para sua conta.</p>}
    {selecionado && <form onSubmit={recorrer}><h3>Recurso do protocolo {selecionado}</h3><label>Fundamento<textarea required minLength={20} maxLength={2000} value={fundamento} disabled={ocupado} onChange={(e) => { setFundamento(e.target.value); tentativa.current = null; }} /></label><div className="g3-acoes"><button type="submit" disabled={ocupado}>Registrar recurso</button><button type="button" disabled={ocupado} onClick={() => setSelecionado('')}>Cancelar</button></div></form>}
  </section>;
}

export default function Denunciar() {
  const { user } = useContext(AuthContext);
  const [form, setForm] = useState({ categoria: 'privacidade', relato: '', referencia: '', contato: '', titularidade: '', evidencia: '', website: '', risco_imediato: false });
  const [recibo, setRecibo] = useState(null);
  const [consulta, setConsulta] = useState({ protocolo: '', segredo: '' });
  const [caso, setCaso] = useState(null);
  const [complemento, setComplemento] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const tentativa = useRef(null);
  const tentativaComplemento = useRef(null);
  const alterar = (campo, valor) => { setForm((f) => ({ ...f, [campo]: valor })); tentativa.current = null; };
  const enviar = async (e) => {
    e.preventDefault(); if (ocupado) return;
    setOcupado(true); setErro('');
    tentativa.current ||= { chave_idempotencia: crypto.randomUUID(), segredo: Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('') };
    try {
      const r = await api.post('/denuncias/', { ...form, ...tentativa.current });
      const novo = { protocolo: r.data.protocolo, segredo: tentativa.current.segredo };
      setRecibo(novo); setConsulta(novo); setCaso(r.data);
    } catch (falha) { setErro(erroLegivel(falha)); } finally { setOcupado(false); }
  };
  const acompanhar = async (e) => {
    e.preventDefault(); if (ocupado) return;
    setOcupado(true); setErro(''); setCaso(null);
    try { const r = await api.post('/denuncias/acompanhamento/', consulta); setCaso(r.data); }
    catch (falha) { setErro(erroLegivel(falha)); } finally { setOcupado(false); }
  };
  const complementar = async (e) => {
    e.preventDefault(); if (ocupado) return;
    setOcupado(true); setErro(''); tentativaComplemento.current ||= crypto.randomUUID();
    try {
      const r = await api.post('/denuncias/complemento/', { ...consulta, relato: complemento, chave_idempotencia: tentativaComplemento.current });
      setCaso(r.data); setComplemento(''); tentativaComplemento.current = null;
    } catch (falha) { setErro(erroLegivel(falha)); } finally { setOcupado(false); }
  };
  const salvarRecibo = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(recibo, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = `protocolo-${recibo.protocolo}.json`; a.click(); URL.revokeObjectURL(url);
  };
  return <main className="g3-page"><header><Link to="/">ParaBook</Link><h1>Denúncia e acompanhamento</h1><p>Você pode relatar uma situação sem criar conta. Informe apenas o necessário e evite documentos civis ou dados de terceiros.</p></header>
    <p>Em risco imediato, busque também os serviços de emergência competentes. O atendimento ParaBook ocorre em Brasília, seg–sex 9–18 e sáb 10–15, exceto feriados.</p>
    {erro && <p className="g3-card" role="alert">{erro}</p>}
    <div className="g3-colunas"><section className="g3-card"><h2>Registrar denúncia</h2>
      {recibo ? <><p role="status">Recebimento automático registrado. A confirmação humana será acompanhada separadamente.</p><label>Protocolo<input readOnly value={recibo.protocolo} /></label><label>Código privado<input readOnly value={recibo.segredo} /></label><p>Guarde estes dois valores em local privado. Quem possui o código pode consultar a resposta. Eles permanecem nesta página até você sair.</p><button type="button" onClick={salvarRecibo}>Salvar comprovante privado</button><button type="button" onClick={() => { setRecibo(null); tentativa.current = null; setForm((f) => ({ ...f, relato: '', referencia: '', contato: '', titularidade: '', evidencia: '' })); }}>Registrar outra situação</button></> :
      <form onSubmit={enviar}><fieldset disabled={ocupado}><label>Categoria<select value={form.categoria} onChange={(e) => alterar('categoria', e.target.value)}>{CATEGORIAS.map(([id, texto]) => <option key={id} value={id}>{texto}</option>)}</select></label><label>Link ou identificação do conteúdo<input required maxLength={500} value={form.referencia} onChange={(e) => alterar('referencia', e.target.value)} /></label><label>O que ocorreu?<textarea required minLength={20} maxLength={4000} value={form.relato} onChange={(e) => alterar('relato', e.target.value)} /></label><label>Contato opcional (e-mail)<input type="email" maxLength={254} value={form.contato} onChange={(e) => alterar('contato', e.target.value)} /></label>
      {form.categoria === 'direitos_autorais' && <><label>Titularidade alegada<textarea required maxLength={1000} value={form.titularidade} onChange={(e) => alterar('titularidade', e.target.value)} /></label><label>Evidência mínima ou referência<textarea required maxLength={2000} value={form.evidencia} onChange={(e) => alterar('evidencia', e.target.value)} /></label></>}
      <label className="g3-check"><input type="checkbox" checked={form.risco_imediato} onChange={(e) => alterar('risco_imediato', e.target.checked)} />Há risco imediato à segurança</label><div className="g3-honeypot" aria-hidden="true"><label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => alterar('website', e.target.value)} /></label></div><p>A resposta fica no protocolo. Informar e-mail não significa envio automático.</p><button type="submit">{ocupado ? 'Enviando...' : 'Registrar e obter protocolo'}</button></fieldset></form>}
    </section><section className="g3-card"><h2>Consultar resposta</h2><form onSubmit={acompanhar}><fieldset disabled={ocupado}><label>Protocolo<input required value={consulta.protocolo} onChange={(e) => { setConsulta((c) => ({ ...c, protocolo: e.target.value.trim() })); setCaso(null); tentativaComplemento.current = null; }} /></label><label>Código privado<input required minLength={64} maxLength={64} value={consulta.segredo} autoComplete="off" onChange={(e) => { setConsulta((c) => ({ ...c, segredo: e.target.value.trim() })); setCaso(null); tentativaComplemento.current = null; }} /></label><button type="submit">Consultar protocolo</button></fieldset></form>
      {caso && <EstadoProtocolo caso={caso} />}{caso?.pode_complementar && <form onSubmit={complementar}><label>Complemento solicitado<textarea required minLength={20} maxLength={4000} disabled={ocupado} value={complemento} onChange={(e) => { setComplemento(e.target.value); tentativaComplemento.current = null; }} /></label><button disabled={ocupado} type="submit">Enviar complemento</button></form>}
    </section></div>{user && <MeusCasos />}<p><Link to="/direitos-autorais">Direitos autorais</Link> · <Link to="/privacidade">Privacidade e canal de contato</Link></p>
  </main>;
}
