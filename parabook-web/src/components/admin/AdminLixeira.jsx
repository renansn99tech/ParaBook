import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import swal, { BOTAO } from '../../services/swal';

function diasRestantes(data, retencao) {
  if (!data) return retencao;
  const decorridos = Math.floor(Math.max(0, Date.now() - new Date(data).getTime()) / 86400000);
  return Math.max(0, retencao - decorridos);
}

function AdminLixeira({ onFilaAlterada, onNotificar }) {
  const [dados, setDados] = useState({ obras: [], denuncias: [] });
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState([]);

  useEffect(() => {
    let ativo = true;
    api.get('/dashboard/lixeira/').then((resposta) => ativo && setDados(resposta.data)).catch((error) => console.error('Erro ao buscar lixeira', error)).finally(() => ativo && setLoading(false));
    return () => { ativo = false; };
  }, []);

  const itens = useMemo(() => [
    ...dados.obras.map((item) => ({ ...item, categoria: 'obra', titulo_item: item.titulo })),
    ...dados.denuncias.map((item) => ({ ...item, categoria: 'denuncia', titulo_item: item.livro })),
  ].sort((a, b) => new Date(b.data_remocao || b.data_arquivamento || 0) - new Date(a.data_remocao || a.data_arquivamento || 0)), [dados]);

  const remover = (item) => setDados((atual) => ({ ...atual, obras: item.categoria === 'obra' ? atual.obras.filter((registro) => registro.id !== item.id) : atual.obras, denuncias: item.categoria === 'denuncia' ? atual.denuncias.filter((registro) => registro.id !== item.id) : atual.denuncias }));
  const restaurarEstado = (item) => setDados((atual) => item.categoria === 'obra' ? ({ ...atual, obras: atual.obras.some((registro) => registro.id === item.id) ? atual.obras : [...atual.obras, item] }) : ({ ...atual, denuncias: atual.denuncias.some((registro) => registro.id === item.id) ? atual.denuncias : [...atual.denuncias, item] }));

  const agir = async (item, acao) => {
    const permanente = acao.includes('excluir');
    const chave = `${item.categoria}-${item.id}`;
    if (processando.includes(chave)) return;
    const confirmacao = await swal.fire({ title: permanente ? 'Excluir permanentemente?' : 'Restaurar obra?', text: permanente ? 'Esta operação não poderá ser desfeita.' : 'A obra voltará ao catálogo como publicada.', icon: 'warning', showCancelButton: true, confirmButtonText: permanente ? 'Excluir agora' : 'Restaurar', cancelButtonText: 'Cancelar', confirmButtonColor: permanente ? BOTAO.perigo : BOTAO.sucesso, cancelButtonColor: BOTAO.neutro });
    if (!confirmacao.isConfirmed) return;
    setProcessando((atuais) => [...atuais, chave]);
    remover(item);
    try {
      await api.post('/dashboard/lixeira/', { acao, item_id: item.id });
      onNotificar?.(permanente ? 'Item excluído permanentemente.' : 'Obra restaurada no catálogo.');
      await onFilaAlterada?.();
    } catch (error) {
      restaurarEstado(item);
      swal.fire({ icon: 'error', title: 'Operação não concluída', text: error.response?.data?.erro || 'O item voltou para a Lixeira.' });
    } finally {
      setProcessando((atuais) => atuais.filter((registro) => registro !== chave));
    }
  };

  return (
    <section className="secao dash-fila-page">
      <h1 className="admin-titulo-icone"><i className="fa-solid fa-trash-can" aria-hidden="true"></i> Lixeira do Sistema</h1><p className="admin-subtitulo">Restaure obras ou conclua exclusões permanentes com confirmação explícita.</p>
      {loading ? <div className="admin-panel"><p className="admin-estado">Carregando...</p></div> : itens.length > 0 ? <div className="dash-fila-lista">{itens.map((item) => {
        const data = item.data_remocao || item.data_arquivamento;
        const restantes = diasRestantes(data, item.dias_retencao);
        const chave = `${item.categoria}-${item.id}`;
        return <article key={chave} className="dash-fila-card dash-fila-card--lixeira"><header><span className="dash-fila-icone"><i className={`fa-solid ${item.categoria === 'obra' ? 'fa-book-skull' : 'fa-box-archive'}`} aria-hidden="true"></i></span><div><span className="dash-tipo dash-tipo--lixeira">{item.categoria === 'obra' ? 'Obra removida' : 'Denúncia arquivada'}</span><h2>{item.titulo_item}</h2><p>{item.categoria === 'denuncia' ? item.motivo : 'Fora do catálogo público'}</p></div><span className={`dash-retencao ${restantes <= 2 ? 'is-urgent' : ''}`}>{restantes} {restantes === 1 ? 'dia restante' : 'dias restantes'}</span></header><p className="dash-fila-dica"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i>{data ? `Movido para a Lixeira em ${new Intl.DateTimeFormat('pt-BR').format(new Date(data))}.` : 'Data de remoção não registrada; prazo integral considerado.'}</p><footer><span></span><div>{item.categoria === 'obra' && <button type="button" className="admin-btn-mini ok" disabled={processando.includes(chave)} onClick={() => agir(item, 'restaurar_livro')}>Restaurar</button>}<button type="button" className="admin-btn-mini nao" disabled={processando.includes(chave)} onClick={() => agir(item, item.categoria === 'obra' ? 'excluir_livro_permanente' : 'excluir_denuncia_permanente')}>{processando.includes(chave) ? 'Processando...' : 'Excluir agora'}</button></div></footer></article>;
      })}</div> : <div className="dash-fila-zerada dash-fila-zerada--lixeira"><i className="fa-solid fa-trash-can-arrow-up" aria-hidden="true"></i><h2>Lixeira vazia</h2><p>Nenhum conteúdo aguarda restauração ou exclusão permanente.</p></div>}
    </section>
  );
}

export default AdminLixeira;
