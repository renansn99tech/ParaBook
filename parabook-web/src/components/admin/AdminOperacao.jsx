import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../assets/css/moderacao.css';

const ROTULOS = { assumir: 'Assumir atendimento', triagem: 'Registrar triagem', confirmar: 'Confirmar recebimento humano', complemento: 'Pedir complemento', decidir: 'Registrar decisão', comunicar: 'Disponibilizar decisão no protocolo', encerrar: 'Encerrar atendimento', recurso_decidir: 'Decidir recurso', conselho_solicitar: 'Solicitar decisão do Conselho', conselho_aprovar: 'Aprovar no Conselho', conselho_executar: 'Executar decisão aprovada', conselho_cancelar: 'Cancelar pedido do Conselho' };
const CAMPOS = {
  assumir: [], triagem: ['prioridade', 'calendario_id', 'alvo_tipo', 'alvo_id'], confirmar: ['resposta'], complemento: ['resposta'],
  decidir: ['medida', 'duracao_dias', 'resposta', 'regra', 'evidencia_ref', 'senha_atual'], comunicar: [], encerrar: [],
  recurso_decidir: ['acolher', 'resposta', 'regra', 'evidencia_ref', 'senha_atual'],
  conselho_solicitar: ['conselho_acao', 'motivo', 'senha_atual'], conselho_aprovar: ['pedido', 'motivo', 'senha_atual'],
  conselho_executar: ['pedido', 'motivo', 'resposta', 'regra', 'evidencia_ref', 'senha_atual'], conselho_cancelar: ['pedido', 'motivo', 'senha_atual'],
};
const INICIAL = { prioridade: 'P2', calendario_id: '', alvo_tipo: '', alvo_id: '', medida: 'orientacao', duracao_dias: '3', resposta: '', regra: '', evidencia_ref: '', motivo: '', senha_atual: '', conselho_acao: 'remover', pedido: '', acolher: 'false' };
const mensagemErro = (erro) => Object.values(erro.response?.data || {}).flat().filter((v) => typeof v === 'string').join(' ') || 'Não foi possível concluir a operação. Atualize ou tente novamente.';
const data = (valor) => valor ? new Date(valor).toLocaleString('pt-BR') : 'Não calculado';

function Calendarios({ itens, atualizar, notificar }) {
  const [dados, setDados] = useState({ inicio: '', fim: '', feriados: '', referencia: '', senha_atual: '' });
  const [erro, setErro] = useState(''); const [ocupado, setOcupado] = useState(false);
  const salvar = async (e) => {
    e.preventDefault(); if (ocupado) return; setOcupado(true); setErro('');
    try {
      await api.post('/dashboard/calendario-moderacao/', { ...dados, feriados: dados.feriados.split(/[,\s]+/).filter(Boolean) });
      setDados((d) => ({ ...d, senha_atual: '' })); await atualizar(); notificar?.('Calendário conferido registrado.');
    } catch (falha) { setErro(mensagemErro(falha)); } finally { setOcupado(false); }
  };
  return <details className="g3-card"><summary>Calendário de atendimento</summary><p>Brasília, seg–sex 9–18, sáb 10–15. Domingos e feriados conferidos ficam fora da contagem. Sem calendário suficiente, o prazo aparece não calculado.</p>
    <ul>{itens.map((c) => <li key={c.id}>{c.inicio} a {c.fim} · {c.referencia}</li>)}</ul><form onSubmit={salvar}><fieldset disabled={ocupado}><div className="g3-colunas"><label>Início<input required type="date" value={dados.inicio} onChange={(e) => setDados((d) => ({ ...d, inicio: e.target.value }))} /></label><label>Fim<input required type="date" value={dados.fim} onChange={(e) => setDados((d) => ({ ...d, fim: e.target.value }))} /></label></div><label>Feriados conferidos (AAAA-MM-DD, separados por espaço)<textarea value={dados.feriados} onChange={(e) => setDados((d) => ({ ...d, feriados: e.target.value }))} /></label><label>Referência da conferência<input required minLength={10} maxLength={200} value={dados.referencia} onChange={(e) => setDados((d) => ({ ...d, referencia: e.target.value }))} /></label><label>Senha atual<input required type="password" autoComplete="current-password" value={dados.senha_atual} onChange={(e) => setDados((d) => ({ ...d, senha_atual: e.target.value }))} /></label>{erro && <p role="alert">{erro}</p>}<button type="submit">Registrar calendário conferido</button></fieldset></form></details>;
}

export default function AdminOperacao({ onNotificar }) {
  const [fila, setFila] = useState({ resultados: [], total: 0, pagina: 1 });
  const [calendarios, setCalendarios] = useState([]); const [pagina, setPagina] = useState(1); const [filtro, setFiltro] = useState('');
  const [selecionado, setSelecionado] = useState(null); const [acao, setAcao] = useState('assumir'); const [dados, setDados] = useState(INICIAL);
  const [erro, setErro] = useState(''); const [carregando, setCarregando] = useState(true); const [ocupado, setOcupado] = useState(false);
  const tentativa = useRef(null); const titulo = useRef(null); const acionador = useRef(null);
  const botoesCasos = useRef(new Map()); const botaoAtualizar = useRef(null); const retornarFoco = useRef(false);
  const carregar = useCallback(async () => {
    const [casos, calendario] = await Promise.all([api.get('/dashboard/casos/', { params: { pagina, estado: filtro } }), api.get('/dashboard/calendario-moderacao/')]);
    setFila(casos.data); setCalendarios(calendario.data);
    setSelecionado((atual) => atual ? casos.data.resultados.find((caso) => caso.protocolo === atual.protocolo) || atual : null);
  }, [pagina, filtro]);
  useEffect(() => { let ativo = true; carregar().catch((e) => { if (ativo) setErro(mensagemErro(e)); }).finally(() => { if (ativo) setCarregando(false); }); return () => { ativo = false; }; }, [carregar]);
  const protocoloSelecionado = selecionado?.protocolo;
  useEffect(() => {
    if (protocoloSelecionado) titulo.current?.focus();
    else if (retornarFoco.current) {
      (botoesCasos.current.get(acionador.current) || botaoAtualizar.current)?.focus();
      retornarFoco.current = false;
    }
  }, [protocoloSelecionado]);
  const alterar = (campo, valor) => { tentativa.current = null; setDados((d) => ({ ...d, [campo]: valor })); };
  const abrir = (caso) => { acionador.current = caso.protocolo; setSelecionado(caso); setErro(''); setAcao('assumir'); setDados({ ...INICIAL, prioridade: caso.prioridade || 'P2' }); tentativa.current = null; };
  const fechar = () => { retornarFoco.current = true; setSelecionado(null); setDados(INICIAL); tentativa.current = null; };
  const sincronizar = async () => {
    if (ocupado) return; setOcupado(true); setErro('');
    try { const r = await api.post('/dashboard/casos/', {}); await carregar(); onNotificar?.(`${r.data.criados} origens vinculadas. Protocolos existentes preservados.`); }
    catch (falha) { setErro(mensagemErro(falha)); } finally { setOcupado(false); }
  };
  const salvar = async (e) => {
    e.preventDefault(); if (ocupado) return; setOcupado(true); setErro(''); tentativa.current ||= crypto.randomUUID();
    const corpo = { acao, chave_idempotencia: tentativa.current };
    for (const campo of CAMPOS[acao]) {
      if (campo === 'duracao_dias' && dados.medida !== 'suspensao_conta') continue;
      if ((campo === 'alvo_tipo' || campo === 'alvo_id') && !dados.alvo_tipo) continue;
      if (campo === 'calendario_id' && !dados.calendario_id) continue;
      corpo[campo] = campo === 'acolher' ? dados[campo] === 'true' : dados[campo];
    }
    try {
      const r = await api.post(`/dashboard/casos/${selecionado.protocolo}/`, corpo);
      setSelecionado(r.data); setDados((d) => ({ ...d, senha_atual: '', pedido: r.data.conselho.findLast((p) => p.estado === 'pendente')?.protocolo || '' })); tentativa.current = null;
      await carregar(); onNotificar?.('Operação registrada no protocolo.');
    } catch (falha) { setErro(mensagemErro(falha)); } finally { setOcupado(false); }
  };
  const campos = CAMPOS[acao];
  return <section className="secao g3-operacao"><h1>Operação e moderação</h1><p className="admin-subtitulo">Protocolo, responsável, prioridade e retorno. Confirmação automática, atendimento humano e comunicação são etapas distintas.</p>
    <div className="g3-acoes"><button className="btn-outline" type="button" disabled={ocupado} onClick={sincronizar}>Vincular denúncias e suporte existentes</button><button ref={botaoAtualizar} className="btn-outline" type="button" disabled={ocupado} onClick={() => carregar().catch((e) => setErro(mensagemErro(e)))}>Atualizar fila</button></div>
    {!selecionado && <><div className="g3-card"><label>Exibir<select value={filtro} onChange={(e) => { setFiltro(e.target.value); setPagina(1); }}>{[['', 'Em andamento'], ['aguarda_triagem', 'Aguarda triagem'], ['em_analise', 'Em análise'], ['aguarda_complemento', 'Aguarda complemento'], ['decidido', 'Decididos'], ['encerrado', 'Encerrados'], ['todos', 'Todos']].map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select></label>{erro && <p role="alert">{erro}</p>}
      {carregando ? <p role="status">Carregando fila...</p> : <><p>{fila.total} casos · página {pagina}</p><ul className="g3-lista">{fila.resultados.map((caso) => <li key={caso.protocolo}><button ref={(elemento) => { if (elemento) botoesCasos.current.set(caso.protocolo, elemento); else botoesCasos.current.delete(caso.protocolo); }} type="button" onClick={() => abrir(caso)}>{caso.prioridade || 'Sem triagem'} · {caso.categoria} · {caso.estado.replaceAll('_', ' ')}<br />{caso.protocolo}<br />Recebido: {data(caso.recebido_em)} · Responsável: {caso.responsavel || 'Não atribuído'}</button></li>)}</ul>{!fila.resultados.length && <p>Nenhum caso nesta seleção.</p>}<div className="g3-acoes"><button type="button" disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)}>Anterior</button><button type="button" disabled={pagina * 50 >= fila.total} onClick={() => setPagina((p) => p + 1)}>Próxima</button></div></>}
    </div><Calendarios itens={calendarios} atualizar={carregar} notificar={onNotificar} /></>}
    {selecionado && <article className="g3-card"><button type="button" disabled={ocupado} onClick={fechar}>Voltar à fila</button><h2 ref={titulo} tabIndex={-1}>Protocolo {selecionado.protocolo}</h2><p>{selecionado.categoria} · {selecionado.prioridade || 'Sem triagem'} · {selecionado.estado.replaceAll('_', ' ')}</p><div className="g3-prazos">{Object.entries(selecionado.prazos).map(([etapa, prazo]) => <span key={etapa} className={`g3-prazo g3-prazo--${prazo.estado}`}>{etapa}: {prazo.estado.replaceAll('_', ' ')}<br />{data(prazo.ate)}</span>)}</div>
      <h3>Relato e referências de atendimento</h3><dl>{Object.entries(selecionado.dados_atendimento).filter(([campo]) => campo !== 'assinatura').map(([campo, valor]) => <div key={campo}><dt>{({ relato: 'Relato', referencia: 'Referência do conteúdo', contato: 'Contato opcional', titularidade: 'Titularidade alegada', evidencia: 'Evidência mínima', risco_imediato: 'Risco imediato informado', fundamento: 'Fundamento do recurso', motivo: 'Motivo e impacto' })[campo] || campo}</dt><dd className="g3-resposta">{typeof valor === 'boolean' ? valor ? 'Sim' : 'Não' : valor || 'Não informado'}</dd></div>)}</dl>
      {selecionado.origem === 'suporte' && selecionado.categoria === 'idade' ? <p>Este caso é decidido na <Link to="/dashboard?aba=suporte">revisão etária específica</Link>. A fila não altera a declaração ou o estado etário.</p> : <form onSubmit={salvar}><fieldset disabled={ocupado}><label>Ação<select value={acao} onChange={(e) => { setAcao(e.target.value); tentativa.current = null; setDados((d) => ({ ...d, senha_atual: '', pedido: selecionado.conselho.findLast((p) => p.estado === 'pendente')?.protocolo || '' })); }}>{Object.entries(ROTULOS).filter(([a]) => (a !== 'recurso_decidir' || selecionado.origem === 'recurso') && (a !== 'decidir' || selecionado.origem !== 'recurso') && (!a.startsWith('conselho') || selecionado.operador_admin)).map(([a, r]) => <option key={a} value={a}>{r}</option>)}</select></label>
      {campos.includes('prioridade') && <><label>Prioridade<select required value={dados.prioridade} onChange={(e) => alterar('prioridade', e.target.value)}>{['P0', 'P1', 'P2'].map((p) => <option key={p} value={p}>{p}</option>)}</select></label><label>Calendário conferido<select value={dados.calendario_id} onChange={(e) => alterar('calendario_id', e.target.value)}><option value="">Sem calendário — prazo não calculado</option>{calendarios.map((c) => <option key={c.id} value={c.id}>{c.inicio} a {c.fim} · {c.referencia}</option>)}</select></label>
      {selecionado.origem === 'publica' && !selecionado.alvo_usuario && !selecionado.alvo_livro && !selecionado.alvo_comunidade && <><label>Associar alvo confirmado<select value={dados.alvo_tipo} onChange={(e) => alterar('alvo_tipo', e.target.value)}><option value="">Sem alvo identificado</option><option value="livro">Obra</option><option value="comunidade">Comunidade</option><option value="conta">Conta</option></select></label>{dados.alvo_tipo && <label>Identificador do alvo no painel<input type="number" min={1} required value={dados.alvo_id} onChange={(e) => alterar('alvo_id', e.target.value)} /></label>}</>}
      </>}
      {campos.includes('medida') && <label>Medida<select value={dados.medida} onChange={(e) => alterar('medida', e.target.value)}><option value="orientacao">Orientação</option><option value="arquivamento">Arquivamento fundamentado</option><option value="restricao_conteudo">Contenção reversível de conteúdo</option>{selecionado.operador_admin && <option value="suspensao_conta">Suspensão de conta</option>}</select></label>}
      {campos.includes('duracao_dias') && dados.medida === 'suspensao_conta' && <label>Duração<select value={dados.duracao_dias} onChange={(e) => alterar('duracao_dias', e.target.value)}>{[3, 7, 15, 30].map((d) => <option key={d} value={d}>{d} dias</option>)}</select></label>}
      {campos.includes('acolher') && <label>Resultado do recurso<select value={dados.acolher} onChange={(e) => alterar('acolher', e.target.value)}><option value="false">Recusar com fundamento</option><option value="true">Acolher suspensão</option></select></label>}
      {campos.includes('conselho_acao') && <label>Ato excepcional<select value={dados.conselho_acao} onChange={(e) => alterar('conselho_acao', e.target.value)}><option value="remover">Remoção definitiva com retenção aplicável</option><option value="restaurar">Restauração excepcional</option></select></label>}
      {campos.includes('pedido') && <label>Pedido do Conselho<select required value={dados.pedido} onChange={(e) => alterar('pedido', e.target.value)}><option value="">Selecione o pedido pendente</option>{selecionado.conselho.filter((p) => p.estado === 'pendente').map((p) => <option key={p.protocolo} value={p.protocolo}>{p.acao} · {p.protocolo}</option>)}</select></label>}
      {campos.includes('resposta') && <label>Resposta ao titular ou denunciante<textarea required minLength={20} maxLength={4000} value={dados.resposta} onChange={(e) => alterar('resposta', e.target.value)} /></label>}
      {campos.includes('motivo') && <label>Motivo e impacto da decisão<textarea required minLength={20} maxLength={2000} value={dados.motivo} onChange={(e) => alterar('motivo', e.target.value)} /></label>}
      {campos.includes('regra') && <label>Regra aplicada<input required minLength={3} maxLength={200} value={dados.regra} onChange={(e) => alterar('regra', e.target.value)} /></label>}
      {campos.includes('evidencia_ref') && <label>Referência mínima de evidência<input required minLength={3} maxLength={200} value={dados.evidencia_ref} onChange={(e) => alterar('evidencia_ref', e.target.value)} /></label>}
      {campos.includes('senha_atual') && <label>Senha atual<input required type="password" autoComplete="current-password" value={dados.senha_atual} onChange={(e) => setDados((d) => ({ ...d, senha_atual: e.target.value }))} /></label>}
      {acao.startsWith('conselho') && <p>São necessárias duas identidades autorizadas distintas e reautenticadas. {selecionado.conselho_membros_configurados} membros vinculados neste ambiente. A execução confere novamente as travas; o pedido não executa exclusão.</p>}
      {erro && <p role="alert">{erro}</p>}<button type="submit">{ocupado ? 'Registrando...' : ROTULOS[acao]}</button></fieldset></form>}
      <p>Responsável: {selecionado.responsavel || 'Não atribuído'} · Decisor: {selecionado.decisor || 'Ainda não registrado'}</p>
      {selecionado.conselho.length > 0 && <><h3>Pedidos do Conselho</h3><ul>{selecionado.conselho.map((pedido) => <li key={pedido.protocolo}>{pedido.acao} · {pedido.estado} · {pedido.aprovacoes.length}/2 aprovações<br />{pedido.protocolo}</li>)}</ul></>}
      <h3>Histórico</h3><ol>{selecionado.eventos.map((evento, indice) => <li key={indice}>{evento.acao.replaceAll('_', ' ')} · {data(evento.criado_em)} · {evento.ator ? `Operador ${evento.ator}` : 'Entrada pública'}{evento.dados.resposta && <p className="g3-resposta">{evento.dados.resposta}</p>}{evento.dados.relato && <p className="g3-resposta">{evento.dados.relato}</p>}{evento.dados.motivo && <p className="g3-resposta">{evento.dados.motivo}</p>}</li>)}</ol>
    </article>}
  </section>;
}
