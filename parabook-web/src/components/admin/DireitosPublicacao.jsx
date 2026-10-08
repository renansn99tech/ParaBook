import { useEffect, useRef, useState } from 'react';
import api from '../../services/api';

const ROTULOS = {
  legado: 'Política ainda não ativada', pendente: 'Aguardando conferência', conferida: 'Conferidos',
  revogada: 'Revogados', disputa: 'Em disputa', expirada: 'Expirados', ainda_indisponivel: 'Vigência futura',
  territorio_nao_coberto: 'Território fora do escopo', escopo_incompativel: 'Modalidade fora do escopo',
  custodia_indisponivel: 'Conferência precisa ser revalidada',
};

export default function DireitosPublicacao({ livroId, tentativaId, onAtualizar }) {
  const [dados, setDados] = useState(null);
  const [recibo, setRecibo] = useState(null);
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [processando, setProcessando] = useState(false);
  const [atualizacao, setAtualizacao] = useState(0);
  const resumoRef = useRef(null);
  const senhaRef = useRef(null);
  const arquivoRef = useRef(null);

  useEffect(() => {
    let ativo = true;
    api.get(`/dashboard/direitos/${livroId}/`, { params: tentativaId ? { tentativa_id: tentativaId } : {} })
      .then(({ data }) => { if (ativo) { setDados(data); setErro(''); } })
      .catch(() => { if (ativo) setErro('Não foi possível conferir os estados da edição.'); });
    return () => { ativo = false; };
  }, [livroId, tentativaId, atualizacao]);

  async function carregarRecibo(evento) {
    const arquivo = evento.target.files?.[0];
    setRecibo(null);
    setErro('');
    if (!arquivo) return;
    if (arquivo.size > 8192) { setErro('Envie somente o recibo de conferência, com até 8 KB.'); return; }
    try {
      const entrada = JSON.parse(await arquivo.text());
      if (!entrada?.dados || typeof entrada.assinatura !== 'string') throw new Error();
      setRecibo(entrada);
    } catch { setErro('Recibo inválido. Solicite o arquivo de conferência ao responsável.'); }
  }

  function exportarReferencia() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(dados.contexto_custodia, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `edicao-${livroId}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function executar(evento, acao, protocolo) {
    evento.preventDefault();
    if (processando) return;
    setProcessando(true); setErro(''); setAviso('');
    try {
      const entrada = { acao, senha_atual: senha };
      if (acao === 'conferir') { entrada.recibo = recibo; if (tentativaId) entrada.tentativa_id = tentativaId; }
      else entrada.protocolo = protocolo;
      await api.post(`/dashboard/direitos/${livroId}/`, entrada);
      setAviso(acao === 'conferir'
        ? 'Conferência registrada. A aprovação editorial é uma etapa separada.'
        : acao === 'disputa'
          ? 'Disputa registrada. A edição está bloqueada para leitura.'
          : 'Revogação registrada. A edição está bloqueada para leitura.');
      setRecibo(null); setAtualizacao((valor) => valor + 1);
      if (arquivoRef.current) arquivoRef.current.value = '';
      await onAtualizar?.();
      resumoRef.current?.focus();
    } catch (error) {
      setErro(error.response?.data?.detail || 'Operação não registrada. Confira o recibo, a senha e a edição.');
      senhaRef.current?.focus();
    }
    finally { setSenha(''); setProcessando(false); }
  }

  return <section className="direitos-publicacao" aria-label="Direitos e segurança da edição">
    <h3>Direitos e segurança</h3>
    {dados && <p>Direitos: <strong>{ROTULOS[dados.direitos] || 'Indisponíveis'}</strong> · Arquivo: <strong>{dados.seguranca_pdf ? 'Liberado para revisão' : 'Aguardando verificação'}</strong></p>}
    {erro && <p role="alert">{erro} <button type="button" onClick={() => setAtualizacao((v) => v + 1)}>Atualizar</button></p>}
    {aviso && <p role="status">{aviso}</p>}
    {dados?.conferencia_permitida && <details>
      <summary ref={resumoRef}>Registrar ou revisar conferência</summary>
      <p>Os documentos ficam com o responsável pela custódia. Envie aqui apenas o recibo da edição conferida.</p>
      <button className="btn-outline" type="button" onClick={exportarReferencia}>Exportar referência da edição</button>
      <form onSubmit={(evento) => executar(evento, 'conferir')}>
        <label>Recibo de conferência<input ref={arquivoRef} type="file" accept="application/json,.json" disabled={processando} onChange={carregarRecibo} /></label>
        <label>Senha atual<input ref={senhaRef} type="password" autoComplete="current-password" maxLength={128} value={senha} onChange={(evento) => setSenha(evento.target.value)} required /></label>
        <button className="btn-outline" disabled={processando || !recibo || !senha}>{processando ? 'Registrando…' : 'Registrar conferência'}</button>
      </form>
      {dados.licencas.filter((licenca) => licenca.estado === 'conferida').map((licenca) => <div key={licenca.protocolo}>
        <p>Conferência {licenca.versao} · {licenca.vigente_ate ? `até ${new Date(licenca.vigente_ate).toLocaleDateString('pt-BR')}` : 'sem data final registrada'}</p>
        <button className="btn-outline" type="button" disabled={processando || !senha} onClick={(evento) => executar(evento, 'disputa', licenca.protocolo)}>Registrar disputa e bloquear</button>
        <button className="btn-outline" type="button" disabled={processando || !senha} onClick={(evento) => executar(evento, 'revogar', licenca.protocolo)}>Revogar e bloquear</button>
      </div>)}
    </details>}
  </section>;
}
