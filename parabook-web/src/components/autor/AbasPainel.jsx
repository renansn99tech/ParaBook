import { useRef } from 'react';

const ABAS = [
  { id: 'visao', rotulo: 'Visão geral', icone: 'fa-chart-line' },
  { id: 'avancado', rotulo: 'Analytics Pro', icone: 'fa-chart-simple', emBreve: true },
];

function AbasPainel({ ativa, onChange }) {
  const referencias = useRef([]);

  const tratarTecla = (evento, indiceAtual) => {
    let destino = null;
    if (evento.key === 'ArrowRight') destino = (indiceAtual + 1) % ABAS.length;
    if (evento.key === 'ArrowLeft') destino = (indiceAtual - 1 + ABAS.length) % ABAS.length;
    if (evento.key === 'Home') destino = 0;
    if (evento.key === 'End') destino = ABAS.length - 1;
    if (destino === null) return;
    evento.preventDefault();
    referencias.current[destino]?.focus();
    onChange(ABAS[destino].id);
  };

  return (
    <div className="pautor-abas" role="tablist" aria-label="Seções do Painel do Autor">
      {ABAS.map((aba, indice) => (
        <button
          key={aba.id}
          ref={(elemento) => { referencias.current[indice] = elemento; }}
          id={`pautor-tab-${aba.id}`}
          type="button"
          role="tab"
          aria-selected={ativa === aba.id}
          aria-controls={`pautor-painel-${aba.id}`}
          tabIndex={ativa === aba.id ? 0 : -1}
          onClick={() => onChange(aba.id)}
          onKeyDown={(evento) => tratarTecla(evento, indice)}
        >
          <i className={`fa-solid ${aba.icone}`} aria-hidden="true"></i>
          <span>{aba.rotulo}</span>
          {aba.emBreve && <small><i className="fa-solid fa-clock" aria-hidden="true"></i> Em breve</small>}
        </button>
      ))}
    </div>
  );
}

export default AbasPainel;
