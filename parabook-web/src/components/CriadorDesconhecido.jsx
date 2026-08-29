import '../assets/css/criador-comunidade.css';

export const EXPLICACAO_CRIADOR_DESCONHECIDO = 'Este é um registro legado e não possui um criador rastreável.';

function CriadorDesconhecido() {
  return (
    <span
      className="criador-desconhecido"
      tabIndex="0"
      data-tooltip={EXPLICACAO_CRIADOR_DESCONHECIDO}
      aria-label={`Desconhecido. ${EXPLICACAO_CRIADOR_DESCONHECIDO}`}
    >
      Desconhecido
    </span>
  );
}

export default CriadorDesconhecido;
