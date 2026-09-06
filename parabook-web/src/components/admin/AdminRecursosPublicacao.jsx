import { useEffect, useState } from 'react';
import api from '../../services/api';
import swal from '../../services/swal';

export default function AdminRecursosPublicacao({ onFilaAlterada }) {
  const [itens, setItens] = useState([]);
  const [erro, setErro] = useState('');
  const [processando, setProcessando] = useState(false);
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/dashboard/recursos-publicacao/', { signal: controller.signal })
      .then(({ data }) => setItens(data))
      .catch(() => { if (!controller.signal.aborted) setErro('Não foi possível carregar os recursos.'); });
    return () => controller.abort();
  }, [versao]);
  const decidir = async (item, acao) => {
    const resposta = await swal.fire({ title: acao === 'acolher' ? 'Acolher recurso?' : 'Recusar recurso?', input: 'textarea', inputLabel: 'Justificativa da decisão', inputAttributes: { maxlength: 2000 }, inputValidator: (v) => !v.trim() && 'Informe a justificativa.', showCancelButton: true, cancelButtonText: 'Cancelar', confirmButtonText: 'Registrar decisão' });
    if (!resposta.isConfirmed) return;
    setProcessando(true);
    try {
      await api.post('/dashboard/recursos-publicacao/', { id: item.id, acao, motivo: resposta.value });
      setVersao((v) => v + 1);
      await onFilaAlterada?.();
    } catch (falha) { setErro(Object.values(falha.response?.data || {}).flat().join(' ') || 'Decisão não registrada.'); }
    finally { setProcessando(false); }
  };
  const registrarExterna = async (evento) => {
    evento.preventDefault();
    const form = evento.currentTarget;
    const dados = Object.fromEntries(new FormData(form));
    setProcessando(true);
    setErro('');
    try {
      const { data } = await api.post('/biblioteca/denuncias/', dados);
      form.reset();
      await swal.fire({ icon: 'success', title: 'Denúncia externa protocolada', text: `Protocolo: ${data.protocolo}. Informe-o pelo canal em que recebeu a denúncia.` });
      await onFilaAlterada?.();
    } catch (falha) { setErro(Object.values(falha.response?.data || {}).flat().join(' ') || 'Denúncia não registrada.'); }
    finally { setProcessando(false); }
  };
  return <section className="admin-panel">
    <h2>Recursos de publicação</h2>
    {erro && <p role="alert">{erro}</p>}
    {!itens.length && <p>Nenhum recurso aguardando análise.</p>}
    {itens.map((item) => <article key={item.id} className="dash-fila-card">
      <h3>{item.titulo}</h3><p>{item.fundamento}</p><p>Decisão contestada: {item.evento.acao} · {item.evento.motivo}</p>
      {item.mesmo_revisor && <p role="note">Você tomou a decisão inicial. Prefira encaminhar a outro administrador.</p>}
      <button type="button" disabled={processando} onClick={() => decidir(item, 'acolher')}>Acolher recurso</button>
      <button type="button" disabled={processando} onClick={() => decidir(item, 'recusar')}>Recusar recurso</button>
    </article>)}
    <details><summary>Protocolar denúncia recebida por canal externo</summary>
      <p>Registre a referência do atendimento. Não copie documentos de identidade ou dados pessoais para as evidências.</p>
      <form className="form" onSubmit={registrarExterna}>
        <label>ID da obra<input type="number" min="1" name="livro" required /></label>
        <label>Referência do atendimento externo<input name="referencia_externa" maxLength={200} required /></label>
        <label>Motivo<input name="motivo" maxLength={150} required /></label>
        <label>Evidências<textarea name="evidencias" maxLength={4000} required /></label>
        <button disabled={processando}>Registrar denúncia externa</button>
      </form>
    </details>
  </section>;
}
