const LARGURA = 720;
const ALTURA = 250;
const MARGEM_X = 36;
const MARGEM_Y = 28;

function GraficoLinha({ serie = [] }) {
  const maiorValor = Math.max(...serie.map((item) => Number(item.valor) || 0), 0);
  if (serie.length < 2 || maiorValor === 0) {
    const total = serie.reduce((soma, item) => soma + (Number(item.valor) || 0), 0);
    return (
      <div className="pautor-grafico-vazio">
        <strong>{total.toLocaleString('pt-BR')}</strong>
        <span>{maiorValor === 0 ? 'Nenhuma leitura registrada neste período.' : 'Dados insuficientes para desenhar uma curva.'}</span>
      </div>
    );
  }

  const larguraUtil = LARGURA - (MARGEM_X * 2);
  const alturaUtil = ALTURA - (MARGEM_Y * 2);
  const pontos = serie.map((item, indice) => ({
    ...item,
    x: MARGEM_X + ((larguraUtil / (serie.length - 1)) * indice),
    y: MARGEM_Y + alturaUtil - (((Number(item.valor) || 0) / maiorValor) * alturaUtil),
  }));
  const linha = pontos.map((ponto) => `${ponto.x},${ponto.y}`).join(' ');
  const area = `M ${pontos[0].x} ${ALTURA - MARGEM_Y} L ${pontos.map((ponto) => `${ponto.x} ${ponto.y}`).join(' L ')} L ${pontos.at(-1).x} ${ALTURA - MARGEM_Y} Z`;
  const resumo = serie.map((item) => `${item.rotulo}: ${item.valor}`).join(', ');

  return (
    <div className="pautor-grafico">
      <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} preserveAspectRatio="none" role="group" aria-label={`Leituras ao longo do tempo. ${resumo}`}>
        <defs>
          <linearGradient id="pautor-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--purple)" stopOpacity=".42" />
            <stop offset="100%" stopColor="var(--purple)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((posicao) => (
          <line key={posicao} x1={MARGEM_X} x2={LARGURA - MARGEM_X} y1={MARGEM_Y + (alturaUtil * posicao)} y2={MARGEM_Y + (alturaUtil * posicao)} className="pautor-grafico-grade" />
        ))}
        <path d={area} fill="url(#pautor-area)" />
        <polyline points={linha} className="pautor-grafico-linha" />
        {pontos.map((ponto) => (
          <g key={ponto.rotulo}>
            <circle cx={ponto.x} cy={ponto.y} r="6" tabIndex="0" role="img" aria-label={`${ponto.rotulo}, ${ponto.valor} leituras`}>
              <title>{ponto.rotulo}: {ponto.valor} leituras</title>
            </circle>
            <text x={ponto.x} y={ALTURA - 7} textAnchor="middle">{ponto.rotulo}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export default GraficoLinha;
