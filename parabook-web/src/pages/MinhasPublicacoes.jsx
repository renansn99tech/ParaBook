import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import swal from '../services/swal';
import '../assets/css/publicacao-gestao.css';

const ESTADOS = { pendente: 'Em análise', aprovado: 'Aprovada', publicado: 'Publicado', rejeitado: 'Rejeitado', retirado: 'Retirado por você', suspenso: 'Suspenso cautelarmente', removido: 'Removido pela moderação' };
const mensagemErro = (erro) => Object.values(erro.response?.data || {}).flat().join(' ') || 'Não foi possível concluir a operação.';

export default function MinhasPublicacoes() {
  const [obras, setObras] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [mais, setMais] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [liberacao, setLiberacao] = useState(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [versao, setVersao] = useState(0);
  const [selecionada, setSelecionada] = useState(null);
  const [historico, setHistorico] = useState([]);
  const [versoes, setVersoes] = useState([]);
  const [paginaVersoes, setPaginaVersoes] = useState(1);
  const [maisVersoes, setMaisVersoes] = useState(false);
  const editorRef = useRef(null);
  const [paginaHistorico, setPaginaHistorico] = useState(1);
  const [maisHistorico, setMaisHistorico] = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setCarregando(true);
    setErro('');
    Promise.all([
      api.get('/biblioteca/minhas-publicacoes/', { params: { page: pagina }, signal: controller.signal }),
      api.get('/biblioteca/minhas-publicacoes/disponibilidade/', { signal: controller.signal }),
      api.get('/biblioteca/categorias/', { signal: controller.signal }),
    ]).then(([lista, disponibilidade, categoriasResposta]) => {
      setObras(lista.data.results || lista.data);
      setMais(Boolean(lista.data.next));
      setLiberacao(disponibilidade.data.novas_obras_apos);
      setCategorias(categoriasResposta.data.results || categoriasResposta.data);
    }).catch((falha) => { if (!controller.signal.aborted) setErro(mensagemErro(falha)); })
      .finally(() => { if (!controller.signal.aborted) setCarregando(false); });
    return () => controller.abort();
  }, [versao, pagina]);

  useEffect(() => {
    if (!selecionada) return;
    const controller = new AbortController();
    setHistorico([]);
    api.get(`/biblioteca/minhas-publicacoes/${selecionada.id}/historico/`, { params: { page: paginaHistorico }, signal: controller.signal })
      .then(({ data }) => { setHistorico(data.results || data); setMaisHistorico(Boolean(data.next)); })
      .catch((falha) => { if (!controller.signal.aborted) setErro(mensagemErro(falha)); });
    return () => controller.abort();
  }, [selecionada, paginaHistorico, versao]);

  useEffect(() => {
    if (!selecionada) return;
    const controller = new AbortController();
    setVersoes([]);
    api.get(`/biblioteca/minhas-publicacoes/${selecionada.id}/versoes/`, { params: { page: paginaVersoes }, signal: controller.signal })
      .then(({ data }) => { setVersoes(data.results || data); setMaisVersoes(Boolean(data.next)); })
      .catch((falha) => { if (!controller.signal.aborted) setErro(mensagemErro(falha)); });
    return () => controller.abort();
  }, [selecionada, paginaVersoes, versao]);

  useEffect(() => { if (selecionada) editorRef.current?.focus(); }, [selecionada]);

  const executar = async (url, dados, multipart = false) => {
    setProcessando(true);
    setErro('');
    try {
      await api.post(url, dados, multipart ? { headers: { 'Content-Type': undefined } } : undefined);
      setVersao((valor) => valor + 1);
      await swal.fire({ icon: 'success', title: 'Operação registrada', text: 'Você pode acompanhar o resultado e as decisões no histórico.' });
      return true;
    } catch (falha) {
      setErro(mensagemErro(falha));
      return false;
    } finally { setProcessando(false); }
  };

  const retirar = async (obra) => {
    const resposta = await swal.fire({ title: 'Retirar sua obra?', text: 'A leitura ficará indisponível. Você precisará aguardar 24 horas para enviar obras novas; poderá continuar editando obras existentes.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Retirar obra', cancelButtonText: 'Cancelar' });
    if (resposta.isConfirmed) {
      if (await executar(`/biblioteca/minhas-publicacoes/${obra.id}/retirar/`, {})) setSelecionada(null);
    }
  };

  const revisar = async (evento) => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const acao = dados.get('acao');
    dados.delete('acao');
    for (const [chave, valor] of [...dados.entries()]) {
      if (valor instanceof File ? !valor.size : !valor) dados.delete(chave);
    }
    if (await executar(`/biblioteca/minhas-publicacoes/${selecionada.id}/${acao}/`, dados, true)) setSelecionada(null);
  };

  const recorrer = async (evento) => {
    const resposta = await swal.fire({ title: 'Solicitar revisão da decisão', input: 'textarea', inputLabel: 'Fundamento do recurso', inputAttributes: { maxlength: 2000 }, inputValidator: (valor) => !valor.trim() && 'Explique por que a decisão deve ser revista.', showCancelButton: true, confirmButtonText: 'Enviar recurso', cancelButtonText: 'Cancelar' });
    if (resposta.isConfirmed) await executar(`/biblioteca/minhas-publicacoes/${selecionada.id}/recurso/`, { evento: evento.id, fundamento: resposta.value });
  };

  const bloqueado = liberacao && new Date(liberacao).getTime() > Date.now();
  return <main className="publicacao-gestao">
    <header className="content-glass-card"><h1>Minhas publicações</h1><p>Acompanhe suas obras, versões e decisões de moderação.</p>
      {bloqueado ? <p role="status">Novas obras a partir de {new Date(liberacao).toLocaleString('pt-BR')}. Edições continuam disponíveis.</p> : <Link className="btn-primary" to="/publicar">Enviar nova obra</Link>}
      <Link className="btn-outline" to="/autor/painel">Painel do autor</Link>
    </header>
    {erro && <p role="alert">{erro} <button type="button" onClick={() => setVersao((v) => v + 1)}>Atualizar</button></p>}
    {carregando ? <p role="status">Carregando publicações…</p> : <>
      {!obras.length && <p>Nenhuma obra enviada ainda.</p>}
      <div className="publicacao-obras">{obras.map((obra) => <article key={obra.id} className="content-glass-card">
        <h2>{obra.titulo}</h2><p>{ESTADOS[obra.status] || 'Indisponível'}</p>
        <button type="button" className="btn-outline" disabled={processando} onClick={() => { setSelecionada(obra); setPaginaHistorico(1); setPaginaVersoes(1); }}>Editar e acompanhar</button>
        {obra.status !== 'retirado' && <button type="button" className="btn-outline" disabled={processando} onClick={() => retirar(obra)}>Retirar obra</button>}
      </article>)}</div>
      <nav aria-label="Páginas de publicações"><button type="button" disabled={pagina === 1} onClick={() => setPagina(pagina - 1)}>Anterior</button><span>Página {pagina}</span><button type="button" disabled={!mais} onClick={() => setPagina(pagina + 1)}>Próxima</button></nav>
    </>}
    {selecionada && <section ref={editorRef} tabIndex={-1} className="content-glass-card" aria-label={`Gerenciar ${selecionada.titulo}`}>
      <h2>{selecionada.titulo}</h2><button type="button" onClick={() => setSelecionada(null)}>Fechar edição</button>
      <p>PDF e alterações editoriais passam por análise. A versão publicada permanece disponível. Editar uma obra retirada não a republica.</p>
      <form key={selecionada.id} onSubmit={revisar} className="publicacao-form">
        <label>Título<input name="titulo" defaultValue={selecionada.titulo} maxLength={255} required /></label>
        <label>Categoria<select name="categoria" defaultValue={selecionada.categoria}>{categorias.map((c) => <option value={c.id} key={c.id}>{c.nome}</option>)}</select></label>
        <label>Edição<input name="edicao" defaultValue={selecionada.edicao || ''} maxLength={100} /></label>
        <label>Novo PDF (opcional)<input name="pdf" type="file" accept="application/pdf" /></label>
        <label>Nova capa (opcional)<input name="capa" type="file" accept="image/*" /></label>
        <label>Operação<select name="acao"><option value="revisar">Enviar edição para análise</option>{['retirado', 'rejeitado'].includes(selecionada.status) && <option value="reenviar">Solicitar nova publicação</option>}</select></label>
        <button className="btn-primary" disabled={processando}>{processando ? 'Enviando…' : 'Enviar versão'}</button>
      </form>
      <h3>Versões enviadas</h3>
      <ul>{versoes.map((v) => <li key={v.id}><strong>{v.dados.titulo}</strong> · {ESTADOS[v.status] || v.status}<p>{v.dados.edicao || 'Edição não informada'} · {new Date(v.criada_em).toLocaleString('pt-BR')}</p>{v.motivo && <p>{v.motivo}</p>}</li>)}</ul>
      <nav aria-label="Páginas de versões"><button type="button" disabled={paginaVersoes === 1} onClick={() => setPaginaVersoes(paginaVersoes - 1)}>Anterior</button><span>Página {paginaVersoes}</span><button type="button" disabled={!maisVersoes} onClick={() => setPaginaVersoes(paginaVersoes + 1)}>Próxima</button></nav>
      <h3>Histórico e recursos</h3>
      {!historico.length && <p>Nenhum evento nesta página. Obras antigas mantêm a solicitação original preservada.</p>}
      <ol>{historico.map((evento) => <li key={evento.id}><strong>{evento.acao.replaceAll('_', ' ')}</strong> · {new Date(evento.criado_em).toLocaleString('pt-BR')}<p>{evento.motivo}</p><small>Protocolo: {evento.protocolo}</small>{evento.recurso_status && <p>Recurso: {evento.recurso_status}</p>}{evento.pode_recorrer && <button type="button" disabled={processando} onClick={() => recorrer(evento)}>Recorrer desta decisão</button>}</li>)}</ol>
      <nav aria-label="Páginas do histórico"><button type="button" disabled={paginaHistorico === 1} onClick={() => setPaginaHistorico(paginaHistorico - 1)}>Anterior</button><button type="button" disabled={!maisHistorico} onClick={() => setPaginaHistorico(paginaHistorico + 1)}>Próxima</button></nav>
    </section>}
  </main>;
}
