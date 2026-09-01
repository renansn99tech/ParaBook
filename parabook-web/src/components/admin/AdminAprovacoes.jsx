import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import swal, { BOTAO } from '../../services/swal';

const FILTROS = [['tudo', 'Tudo'], ['autoria', 'Autoria'], ['publicacao', 'Publicação']];

function relativo(data) {
  if (!data) return 'agora';
  const horas = Math.floor(Math.max(0, Date.now() - new Date(data).getTime()) / 3600000);
  if (horas < 1) return 'há menos de 1h';
  if (horas < 24) return `há ${horas}h`;
  const dias = Math.floor(horas / 24);
  return dias === 1 ? 'ontem' : `há ${dias} dias`;
}

function AdminAprovacoes({ onFilaAlterada, onNotificar, onNavegar }) {
  const [dados, setDados] = useState({ perfis: [], publicacoes: [] });
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState([]);
  const [filtroFila, setFiltroFila] = useState('tudo');
  const [ordem, setOrdem] = useState('antigos');

  useEffect(() => {
    let ativo = true;
    api.get('/dashboard/aprovacoes/').then((resposta) => ativo && setDados(resposta.data)).catch((error) => console.error('Erro ao buscar aprovações', error)).finally(() => ativo && setLoading(false));
    return () => { ativo = false; };
  }, []);

  const itens = useMemo(() => [
    ...dados.perfis.map((item) => ({ ...item, tipo: 'autoria', categoria: 'autor', titulo: item.nome || `@${item.username}`, criado_em: item.data })),
    ...dados.publicacoes.map((item) => ({ ...item, categoria_livro: item.categoria_livro || item.categoria, tipo: 'publicacao', categoria: 'publicacao', titulo: item.titulo_livro, criado_em: item.data_envio })),
  ], [dados]);
  const contagens = { tudo: itens.length, autoria: dados.perfis.length, publicacao: dados.publicacoes.length };
  const visiveis = useMemo(() => itens.filter((item) => filtroFila === 'tudo' || item.tipo === filtroFila).sort((a, b) => ordem === 'antigos' ? new Date(a.criado_em) - new Date(b.criado_em) : new Date(b.criado_em) - new Date(a.criado_em)), [filtroFila, itens, ordem]);

  const remover = (item) => setDados((atual) => ({ ...atual, perfis: item.categoria === 'autor' ? atual.perfis.filter((registro) => registro.id !== item.id) : atual.perfis, publicacoes: item.categoria === 'publicacao' ? atual.publicacoes.filter((registro) => registro.id !== item.id) : atual.publicacoes }));
  const restaurar = (item) => setDados((atual) => item.categoria === 'autor' ? ({ ...atual, perfis: atual.perfis.some((registro) => registro.id === item.id) ? atual.perfis : [...atual.perfis, item] }) : ({ ...atual, publicacoes: atual.publicacoes.some((registro) => registro.id === item.id) ? atual.publicacoes : [...atual.publicacoes, item] }));

  const decidir = async (item, acao) => {
    const chave = `${item.categoria}-${item.id}`;
    if (processando.includes(chave)) return;
    let observacao = '';
    if (acao === 'recusar') {
      const resultado = await swal.fire({ title: 'Recusar solicitação?', input: 'textarea', inputLabel: 'Informe o motivo que será enviado ao solicitante', inputPlaceholder: 'Explique objetivamente o que precisa ser corrigido...', inputAttributes: { maxlength: '1000' }, inputValidator: (valor) => valor.trim() ? undefined : 'O motivo é obrigatório.', showCancelButton: true, confirmButtonText: 'Recusar', cancelButtonText: 'Cancelar', confirmButtonColor: BOTAO.perigo, cancelButtonColor: BOTAO.neutro });
      if (!resultado.isConfirmed) return;
      observacao = resultado.value.trim();
    } else {
      const resultado = await swal.fire({ title: 'Aprovar solicitação?', text: `${item.titulo} será liberado após esta decisão.`, icon: 'question', showCancelButton: true, confirmButtonText: 'Aprovar', cancelButtonText: 'Cancelar', confirmButtonColor: BOTAO.sucesso, cancelButtonColor: BOTAO.neutro });
      if (!resultado.isConfirmed) return;
    }
    setProcessando((atuais) => [...atuais, chave]);
    remover(item);
    try {
      await api.post(`/dashboard/moderacao/${item.categoria}/${item.id}/`, { acao, observacao });
      onNotificar?.(acao === 'aprovar' ? 'Solicitação aprovada.' : 'Solicitação recusada com justificativa.');
      await onFilaAlterada?.();
    } catch (error) {
      restaurar(item);
      swal.fire({ icon: 'error', title: 'Decisão não registrada', text: error.response?.data?.detail || 'O item voltou para a fila.' });
    } finally {
      setProcessando((atuais) => atuais.filter((registro) => registro !== chave));
    }
  };

  return (
    <section className="secao dash-fila-page">
      <div className="dash-secao-cabecalho"><div><h1>Central de Aprovações</h1><p className="admin-subtitulo">Decida solicitações com todo o contexto disponível na mesma tela.</p></div><label className="dash-ordenacao">Ordenar<select value={ordem} onChange={(evento) => setOrdem(evento.target.value)}><option value="antigos">Mais antigos primeiro</option><option value="recentes">Mais recentes primeiro</option></select></label></div>
      <div className="admin-filtros" role="group" aria-label="Filtrar fila de aprovações">{FILTROS.map(([chave, rotulo]) => <button key={chave} type="button" className="admin-filtro" aria-pressed={filtroFila === chave} onClick={() => setFiltroFila(chave)}>{rotulo}<small>{contagens[chave]}</small></button>)}</div>

      {loading ? <div className="admin-panel"><p className="admin-estado">Carregando...</p></div> : visiveis.length > 0 ? <div className="dash-fila-lista">{visiveis.map((item) => {
        const chave = `${item.categoria}-${item.id}`;
        const autoria = item.tipo === 'autoria';
        return <article key={chave} className={`dash-fila-card dash-fila-card--${item.tipo}`}><header><span className="dash-fila-icone"><i className={`fa-solid ${autoria ? 'fa-user-pen' : 'fa-file-circle-check'}`} aria-hidden="true"></i></span><div><span className={`dash-tipo dash-tipo--${item.tipo}`}>{autoria ? 'Autoria' : 'Publicação'}</span><h2>{item.titulo}</h2><p>{autoria ? `@${item.username} · conta criada ${relativo(item.criado_em)}` : `@${item.autor} · enviado ${relativo(item.criado_em)}`}</p></div><span className={`dash-idade ${Date.now() - new Date(item.criado_em).getTime() >= 86400000 ? 'is-atrasado' : ''}`}>{relativo(item.criado_em)}</span></header><dl>{autoria ? <><div><dt>Obras enviadas</dt><dd>{item.obras_enviadas}</dd></div><div><dt>Livros lidos</dt><dd>{item.livros_lidos}</dd></div><div><dt>Apresentação</dt><dd>{item.bio ? 'Preenchida' : 'Ausente'}</dd></div></> : <><div><dt>Categoria</dt><dd>{item.categoria_livro}</dd></div><div><dt>ISBN</dt><dd>{item.isbn || 'Não informado'}</dd></div><div><dt>Capa</dt><dd>{item.tem_capa ? 'Enviada' : 'Ausente'}</dd></div></>}</dl><p className="dash-fila-dica"><i className="fa-solid fa-circle-info" aria-hidden="true"></i>{autoria ? (item.bio ? 'Perfil com apresentação — confira o histórico antes da decisão.' : 'Apresentação ausente — considere solicitar complementação.') : (item.tem_capa && item.isbn ? 'Dados editoriais principais informados.' : 'Há dados editoriais que merecem revisão.')}</p><footer><div>{autoria ? <Link to={`/perfil/${item.username}`} className="btn-outline">Abrir perfil</Link> : <Link to={`/livro/${item.livro_id}`} className="btn-outline">Abrir obra</Link>}</div><div><button type="button" className="admin-btn-mini nao" disabled={processando.includes(chave)} onClick={() => decidir(item, 'recusar')}>Recusar</button><button type="button" className="admin-btn-mini ok" disabled={processando.includes(chave)} onClick={() => decidir(item, 'aprovar')}>{processando.includes(chave) ? 'Processando...' : 'Aprovar'}</button></div></footer></article>;
      })}</div> : itens.length > 0 ? <div className="dash-estado-vazio"><i className="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i><span><strong>Nenhum item neste filtro</strong><small>Escolha “Tudo” para visualizar a fila completa.</small></span><button type="button" onClick={() => setFiltroFila('tudo')}>Limpar filtro</button></div> : <div className="dash-fila-zerada"><i className="fa-solid fa-check-double" aria-hidden="true"></i><h2>Fila zerada</h2><p>Não há solicitações aguardando decisão.</p><div><button type="button" onClick={() => onNavegar?.('livros')}>Cadastrar acervo</button><button type="button" className="btn-outline" onClick={() => onNavegar?.('denuncias')}>Revisar denúncias</button></div></div>}
    </section>
  );
}

export default AdminAprovacoes;
