/**
 * Card de comunidade compartilhado entre a listagem pública (Comunidades)
 * e a listagem do usuário (MinhasComunidades). O miolo — nome, badges e
 * descrição — é sempre igual; o que muda são os botões do rodapé, que
 * cada página passa via children.
 */
function CardComunidade({ comunidade, children }) {
  return (
    // Desativada aparece opaca; quem pode vê-la é membro ou admin.
    <article
      className="card-comunidade"
      style={comunidade.em_manutencao ? { opacity: 0.55 } : undefined}
    >
      <div className="comunidade-header">
        <h3 className="comunidade-nome text-truncate" title={comunidade.nome}>
          {comunidade.nome}
        </h3>
        <div className="comunidade-badges">
          <span className="comunidade-badge">
            <i className="fa-solid fa-users"></i>
            {comunidade.total_membros || 0}/{comunidade.max_participantes}
          </span>
          {comunidade.criada_por_sistema && (
            <span className="comunidade-badge comunidade-badge--oficial">
              <i className="fa-solid fa-check-circle"></i>Oficial
            </span>
          )}
          {comunidade.em_manutencao && (
            <span className="comunidade-badge comunidade-badge--inativa">
              <i className="fa-solid fa-power-off"></i>Desativada
            </span>
          )}
        </div>
      </div>

      <p className="comunidade-descricao text-muted">{comunidade.descricao}</p>

      <div className="comunidade-footer mt-auto d-flex gap-2">{children}</div>
    </article>
  );
}

export default CardComunidade;
