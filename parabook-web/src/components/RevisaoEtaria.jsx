import { useEffect, useRef, useState } from 'react';
import api from '../services/api';

const mensagemErro = (falha) => {
  const dados = falha.response?.data;
  return Object.values(dados || {}).flat().filter((valor) => typeof valor === 'string').join(' ')
    || 'Atendimento indisponível. Tente novamente.';
};

export default function RevisaoEtaria({ aoAtualizarEstado }) {
  const [itens, setItens] = useState([]);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const tentativa = useRef(null);
  useEffect(() => {
    let ativo = true;
    api.get('/auth/idade/revisao/').then(({ data }) => { if (ativo) setItens(data); })
      .catch((falha) => { if (ativo) setErro(mensagemErro(falha)); });
    return () => { ativo = false; };
  }, []);
  const atualizar = async () => {
    setOcupado(true); setErro('');
    try {
      const { data } = await api.get('/auth/idade/revisao/');
      setItens(data);
      await aoAtualizarEstado();
    } catch (falha) { setErro(mensagemErro(falha)); }
    finally { setOcupado(false); }
  };
  const solicitar = async (evento) => {
    evento.preventDefault();
    if (ocupado) return;
    setOcupado(true); setErro('');
    try {
      tentativa.current ||= crypto.randomUUID();
      await api.post('/auth/idade/revisao/', { mensagem: mensagem.trim(), chave_idempotencia: tentativa.current });
      tentativa.current = null; setMensagem('');
      const { data } = await api.get('/auth/idade/revisao/');
      setItens(data);
    } catch (falha) { setErro(mensagemErro(falha)); }
    finally { setOcupado(false); }
  };
  const emAndamento = itens.some((item) => ['aberta', 'em_analise'].includes(item.status));
  return <section className="surface-inset mt-4" aria-labelledby="revisao-etaria-titulo">
    <h2 id="revisao-etaria-titulo" className="h4">Revisão e protocolo</h2>
    <p>O recebimento não representa decisão. A resposta fica neste protocolo; não há envio automático de e-mail. Não envie documentos, fotos, biometria ou a data completa na mensagem.</p>
    {erro && <p role="alert" className="text-danger">{erro}</p>}
    {itens.map((item) => <article key={item.id} className="mb-3">
      <p className="text-break"><strong>Protocolo:</strong> {item.protocolo}<br /><strong>Estado:</strong> {item.status.replaceAll('_', ' ')}</p>
      {item.resposta && <p style={{ whiteSpace: 'pre-wrap' }}>{item.resposta}</p>}
      {item.encerrada_em && <p>Encerrado em {new Date(item.encerrada_em).toLocaleString('pt-BR')}.</p>}
    </article>)}
    {!emAndamento && <form onSubmit={solicitar}>
      <label className="form-label" htmlFor="revisao-etaria-mensagem">Explique o que precisa revisar</label>
      <textarea id="revisao-etaria-mensagem" className="form-control mb-3" value={mensagem} disabled={ocupado}
        onChange={(evento) => { tentativa.current = null; setMensagem(evento.target.value); }} minLength={20} maxLength={4000} required />
      <button className="btn-primary w-100" type="submit" disabled={ocupado || mensagem.trim().length < 20}>Solicitar revisão</button>
    </form>}
    {emAndamento && <p role="status">Você já tem um protocolo em andamento. Aguarde a análise e acompanhe a resposta aqui.</p>}
    <button type="button" className="btn btn-link" disabled={ocupado} onClick={atualizar}>Atualizar protocolo e elegibilidade</button>
  </section>;
}
