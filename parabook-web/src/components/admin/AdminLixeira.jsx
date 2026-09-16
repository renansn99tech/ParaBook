import { useEffect, useState } from 'react';
import api from '../../services/api';
import swal from '../../services/swal';

export default function AdminLixeira({ onFilaAlterada, onNotificar }) {
  const [dados, setDados] = useState({ obras: [], denuncias: [] });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(true);
  const [processando, setProcessando] = useState(false);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/dashboard/lixeira/', { signal: controller.signal }).then(({ data }) => setDados(data))
      .catch(() => { if (!controller.signal.aborted) setErro('Não foi possível carregar a lixeira.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [versao]);
  const agir = async (item, acao) => {
    const resposta = await swal.fire({ title: acao === 'reabrir_denuncia' ? 'Reabrir denúncia?' : 'Restaurar obra?', input: 'textarea', inputLabel: acao === 'reabrir_denuncia' ? 'Descreva a evidência nova ou o erro identificado' : 'Justifique a restauração; vigência e restrições serão verificadas', inputAttributes: { maxlength: 2000 }, inputValidator: (v) => !v.trim() && 'Informe a justificativa.', showCancelButton: true, cancelButtonText: 'Cancelar', confirmButtonText: 'Confirmar' });
    if (!resposta.isConfirmed) return;
    setProcessando(true);
    setErro('');
    try {
      await api.post('/dashboard/lixeira/', { acao, item_id: item.id, motivo: resposta.value });
      setVersao((v) => v + 1);
      onNotificar?.('Operação registrada no histórico.');
      await onFilaAlterada?.();
    } catch (falha) { setErro(Object.values(falha.response?.data || {}).flat().join(' ') || 'Operação não concluída.'); }
    finally { setProcessando(false); }
  };
  return <section className="secao dash-fila-page"><h1>Lixeira e restrições</h1>
    <p>Histórico preservado. A exclusão definitiva aguarda a definição da política de retenção.</p>
    {erro && <p role="alert">{erro}</p>}
    {loading ? <p role="status">Carregando…</p> : <div className="dash-fila-lista">
      {dados.obras.map((item) => <article className="dash-fila-card" key={`obra-${item.id}`}><h2>{item.titulo}</h2><p>Fora do catálogo público.</p><button type="button" disabled={processando} onClick={() => agir(item, 'restaurar_livro')}>Restaurar</button></article>)}
      {dados.denuncias.map((item) => <article className="dash-fila-card" key={`denuncia-${item.id}`}><h2>{item.livro}</h2><p>{item.motivo}</p><button type="button" disabled={processando} onClick={() => agir(item, 'reabrir_denuncia')}>Reabrir denúncia</button></article>)}
      {!dados.obras.length && !dados.denuncias.length && <p>Nenhuma obra restrita ou denúncia arquivada.</p>}
    </div>}
  </section>;
}
