import AdminRecursosPublicacao from './AdminRecursosPublicacao';
import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import swal, { BOTAO } from '../../services/swal';

const FILTROS = [['tudo', 'Tudo'], ['livro', 'Livros'], ['comunidade', 'Comunidades']];

function relativo(data) {
  const horas = Math.floor(Math.max(0, Date.now() - new Date(data).getTime()) / 3600000);
  if (horas < 1) return 'há menos de 1h';
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
}

function AdminDenuncias({ onFilaAlterada, onNotificar, onNavegar }) {
  const [dados, setDados] = useState({ livros: [], comunidades: [] });
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState([]);
  const [filtroFila, setFiltroFila] = useState('tudo');

  useEffect(() => {
    let ativo = true;
    api.get('/dashboard/denuncias/').then((resposta) => ativo && setDados(resposta.data)).catch((error) => console.error('Erro ao buscar denúncias', error)).finally(() => ativo && setLoading(false));
    return () => { ativo = false; };
  }, []);

  const itens = useMemo(() => [
    ...dados.livros.map((item) => ({ ...item, categoria: 'livro', titulo: item.livro })),
    ...dados.comunidades.map((item) => ({ ...item, categoria: 'comunidade', titulo: item.comunidade })),
  ], [dados]);
  const contagens = { tudo: itens.length, livro: dados.livros.length, comunidade: dados.comunidades.length };
  const visiveis = itens.filter((item) => filtroFila === 'tudo' || item.categoria === filtroFila).sort((a, b) => new Date(a.data) - new Date(b.data));

  const remover = (item) => setDados((atual) => ({ ...atual, livros: item.categoria === 'livro' ? atual.livros.filter((registro) => registro.id !== item.id) : atual.livros, comunidades: item.categoria === 'comunidade' ? atual.comunidades.filter((registro) => registro.id !== item.id) : atual.comunidades }));
  const restaurar = (item) => setDados((atual) => item.categoria === 'livro' ? ({ ...atual, livros: atual.livros.some((registro) => registro.id === item.id) ? atual.livros : [...atual.livros, item] }) : ({ ...atual, comunidades: atual.comunidades.some((registro) => registro.id === item.id) ? atual.comunidades : [...atual.comunidades, item] }));

  const decidir = async (item, acao) => {
    const chave = `${item.categoria}-${item.id}`;
    if (processando.includes(chave)) return;
    const acolher = acao === 'aprovar';
    const confirmacao = await swal.fire({ title: acao === 'suspender' ? 'Suspender cautelarmente?' : acolher ? 'Acolher denúncia?' : 'Arquivar denúncia?', text: acao === 'suspender' ? 'A restrição cautelar ficará registrada e admitirá recurso.' : acolher ? 'O conteúdo será restringido conforme a regra atual de moderação.' : 'A denúncia será tratada como não procedente e arquivada.', icon: 'warning', showCancelButton: true, confirmButtonText: acao === 'suspender' ? 'Suspender' : acolher ? 'Acolher' : 'Arquivar', cancelButtonText: 'Cancelar', confirmButtonColor: acolher ? BOTAO.perigo : BOTAO.padrao, cancelButtonColor: BOTAO.neutro });
    if (!confirmacao.isConfirmed) return;
    let observacao = '';
    if (item.categoria === 'livro') {
      const justificativa = await swal.fire({ title: 'Fundamento da decisão', input: 'textarea', inputAttributes: { maxlength: 2000 }, inputValidator: (v) => !v.trim() && 'Informe a justificativa.', showCancelButton: true, cancelButtonText: 'Cancelar', confirmButtonText: 'Registrar' });
      if (!justificativa.isConfirmed) return;
      observacao = justificativa.value;
    }
    setProcessando((atuais) => [...atuais, chave]);
    remover(item);
    try {
      await api.post(`/dashboard/moderacao/${item.categoria}/${item.id}/`, { acao, observacao });
      onNotificar?.(acao === 'suspender' ? 'Obra suspensa cautelarmente.' : acolher ? 'Denúncia acolhida e conteúdo restringido.' : 'Denúncia arquivada.');
      const atualizadas = await api.get('/dashboard/denuncias/');
      setDados(atualizadas.data);
      await onFilaAlterada?.();
    } catch (error) {
      restaurar(item);
      swal.fire({ icon: 'error', title: 'Decisão não registrada', text: error.response?.data?.detail || 'A denúncia voltou para a fila.' });
    } finally {
      setProcessando((atuais) => atuais.filter((registro) => registro !== chave));
    }
  };

  return (
    <section className="secao dash-fila-page">
      <AdminRecursosPublicacao onFilaAlterada={async () => { const resposta = await api.get('/dashboard/denuncias/'); setDados(resposta.data); await onFilaAlterada?.(); }} /><h1>Denúncias Recebidas</h1><p className="admin-subtitulo">Analise conteúdo sinalizado usando o tom de alerta reservado à moderação.</p>
      <div className="admin-filtros" role="group" aria-label="Filtrar denúncias">{FILTROS.map(([chave, rotulo]) => <button key={chave} type="button" className="admin-filtro" aria-pressed={filtroFila === chave} onClick={() => setFiltroFila(chave)}>{rotulo}<small>{contagens[chave]}</small></button>)}</div>
      {loading ? <div className="admin-panel"><p className="admin-estado">Carregando...</p></div> : visiveis.length > 0 ? <div className="dash-fila-lista">{visiveis.map((item) => { const chave = `${item.categoria}-${item.id}`; return <article key={chave} className="dash-fila-card dash-fila-card--denuncia"><header><span className="dash-fila-icone"><i className={`fa-solid ${item.categoria === 'livro' ? 'fa-book-open' : 'fa-users'}`} aria-hidden="true"></i></span><div><span className="dash-tipo dash-tipo--denuncia">{item.categoria === 'livro' ? 'Livro' : 'Comunidade'}</span><h2>{item.titulo}</h2><p>Denunciado por @{item.denunciante}</p></div><span className={`dash-idade ${Date.now() - new Date(item.data).getTime() >= 86400000 ? 'is-atrasado' : ''}`}>{relativo(item.data)}</span></header><dl><div><dt>Alvo</dt><dd>{item.categoria === 'livro' ? 'Obra publicada' : 'Comunidade'}</dd></div><div><dt>Denunciante</dt><dd>@{item.denunciante}</dd></div><div><dt>Situação</dt><dd>Aguardando análise</dd></div></dl><p className="dash-fila-dica"><i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>{item.motivo}{item.evidencias && <span> · {item.evidencias}</span>}{item.protocolo && <small> · Protocolo: {item.protocolo}</small>}</p><footer><div><button type="button" className="btn-outline" onClick={() => onNavegar?.(item.categoria === 'livro' ? 'livros' : 'comunidades')}>Analisar contexto</button></div><div>{item.categoria === 'livro' && !item.suspensao_cautelar && <button type="button" className="admin-btn-mini analisar" disabled={processando.includes(chave)} onClick={() => decidir(item, 'suspender')}>Suspender cautelarmente</button>}<button type="button" className="admin-btn-mini analisar" disabled={processando.includes(chave)} onClick={() => decidir(item, 'recusar')}>Arquivar</button><button type="button" className="admin-btn-mini nao" disabled={processando.includes(chave)} onClick={() => decidir(item, 'aprovar')}>{processando.includes(chave) ? 'Processando...' : 'Acolher'}</button></div></footer></article>; })}</div> : itens.length > 0 ? <div className="dash-estado-vazio"><i className="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i><span><strong>Nenhum item neste filtro</strong><small>As demais denúncias continuam disponíveis.</small></span><button type="button" onClick={() => setFiltroFila('tudo')}>Mostrar tudo</button></div> : <div className="dash-fila-zerada"><i className="fa-solid fa-shield-circle-check" aria-hidden="true"></i><h2>Nenhuma denúncia aberta</h2><p>A fila de conteúdo sinalizado está em dia.</p><div><button type="button" onClick={() => onNavegar?.('aprovacoes')}>Ver aprovações</button><button type="button" className="btn-outline" onClick={() => onNavegar?.('comunidades')}>Revisar comunidades</button></div></div>}
    </section>
  );
}

export default AdminDenuncias;
