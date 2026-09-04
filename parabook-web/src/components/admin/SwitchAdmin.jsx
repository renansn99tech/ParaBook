function SwitchAdmin({ ligado, onChange, ariaLabel, tamanho = 'medio', disabled = false }) {
  const tamanhoValido = ['pequeno', 'medio', 'grande'].includes(tamanho) ? tamanho : 'medio';
  return (
    <button
      type="button"
      className={`aa-switch aa-switch--${tamanhoValido}`}
      role="switch"
      aria-checked={ligado}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!ligado)}
    >
      <span className="aa-switch-knob" aria-hidden="true"></span>
    </button>
  );
}

export default SwitchAdmin;
