import { useEffect, useMemo, useRef, useState } from 'react';

const ACOES = [
  { id: 'livros', label: 'Adicionar livro ao acervo', detalhe: 'Abrir gestão de livros', icone: 'fa-book-medical', atalho: 'L' },
  { id: 'aprovacoes', label: 'Ir para aprovações', detalhe: 'Analisar autoria e publicações', icone: 'fa-clipboard-check', atalho: 'A' },
  { id: 'denuncias', label: 'Ver denúncias', detalhe: 'Revisar conteúdo sinalizado', icone: 'fa-flag', atalho: 'D' },
  { id: 'comunidades', label: 'Criar comunidade oficial', detalhe: 'Abrir gestão de comunidades', icone: 'fa-users', atalho: 'C' },
  { id: 'usuarios', label: 'Localizar uma conta', detalhe: 'Abrir busca de usuários', icone: 'fa-user-magnifying-glass', atalho: 'U' },
];

function PaletaComandosAdmin({ aberta, onClose, onNavegar }) {
  const inputRef = useRef(null);
  const focoAnteriorRef = useRef(null);
  const [consulta, setConsulta] = useState('');
  const [selecionado, setSelecionado] = useState(0);
  const resultados = useMemo(() => {
    const termo = consulta.trim().toLocaleLowerCase('pt-BR');
    return termo ? ACOES.filter((acao) => `${acao.label} ${acao.detalhe}`.toLocaleLowerCase('pt-BR').includes(termo)) : ACOES;
  }, [consulta]);

  useEffect(() => {
    if (!aberta) return undefined;
    focoAnteriorRef.current = document.activeElement;
    setConsulta('');
    setSelecionado(0);
    window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => focoAnteriorRef.current?.focus();
  }, [aberta]);

  useEffect(() => {
    if (selecionado >= resultados.length) setSelecionado(0);
  }, [resultados.length, selecionado]);

  if (!aberta) return null;

  const executar = (acao) => {
    if (!acao) return;
    onNavegar(acao.id);
    onClose();
  };

  const aoPressionar = (evento) => {
    if (evento.key === 'Escape') {
      evento.preventDefault();
      onClose();
    } else if (evento.key === 'ArrowDown') {
      evento.preventDefault();
      setSelecionado((atual) => resultados.length ? (atual + 1) % resultados.length : 0);
    } else if (evento.key === 'ArrowUp') {
      evento.preventDefault();
      setSelecionado((atual) => resultados.length ? (atual - 1 + resultados.length) % resultados.length : 0);
    } else if (evento.key === 'Enter') {
      evento.preventDefault();
      executar(resultados[selecionado]);
    }
  };

  return (
    <div className="dash-command-backdrop" onMouseDown={(evento) => evento.target === evento.currentTarget && onClose()}>
      <section className="dash-command" role="dialog" aria-modal="true" aria-labelledby="dash-command-titulo" onKeyDown={aoPressionar}>
        <header><i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input ref={inputRef} type="search" value={consulta} onChange={(evento) => setConsulta(evento.target.value)} placeholder="O que você precisa administrar?" aria-label="Buscar ação administrativa" /><kbd>Esc</kbd></header>
        <div className="dash-command-conteudo">
          <span id="dash-command-titulo">Ações rápidas</span>
          {resultados.length > 0 ? <div role="listbox" aria-label="Ações administrativas">{resultados.map((acao, indice) => <button key={acao.id} type="button" className={selecionado === indice ? 'is-selected' : ''} role="option" aria-selected={selecionado === indice} onMouseEnter={() => setSelecionado(indice)} onClick={() => executar(acao)}><i className={`fa-solid ${acao.icone}`} aria-hidden="true"></i><span><strong>{acao.label}</strong><small>{acao.detalhe}</small></span><kbd>{acao.atalho}</kbd></button>)}</div> : <div className="dash-command-vazio"><i className="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i><span>Nenhuma ação corresponde à busca.</span><button type="button" onClick={() => setConsulta('')}>Mostrar ações rápidas</button></div>}
        </div>
        <footer><span><kbd>↑</kbd><kbd>↓</kbd> navegar</span><span><kbd>Enter</kbd> executar</span></footer>
      </section>
    </div>
  );
}

export default PaletaComandosAdmin;
