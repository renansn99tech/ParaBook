const PERIODOS = [
  { valor: 7, rotulo: '7 dias' },
  { valor: 30, rotulo: '30 dias' },
  { valor: 90, rotulo: '90 dias' },
];

function SeletorPeriodo({ valor, onChange }) {
  return (
    <div className="pautor-periodo" role="radiogroup" aria-label="Período dos dados">
      {PERIODOS.map((periodo) => (
        <button
          key={periodo.valor}
          type="button"
          role="radio"
          aria-checked={valor === periodo.valor}
          className={valor === periodo.valor ? 'is-active' : ''}
          onClick={() => onChange(periodo.valor)}
        >
          {periodo.rotulo}
        </button>
      ))}
    </div>
  );
}

export default SeletorPeriodo;
