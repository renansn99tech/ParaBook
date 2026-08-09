/**
 * Placeholder de carregamento com shimmer (ver .skeleton em
 * assets/css/motion.css). Variantes cobrem os formatos mais comuns nas
 * páginas do app: texto, título, avatar/circular e thumb (capa/imagem).
 */
function Skeleton({ variant = 'text', width, height, className = '', style = {} }) {
  return (
    <span
      className={`skeleton skeleton-${variant} ${className}`.trim()}
      style={{ width, height, ...style }}
      aria-hidden="true"
    />
  );
}

export default Skeleton;
