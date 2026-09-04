import { Link } from 'react-router-dom';
import CriadorDesconhecido from './CriadorDesconhecido';

/**
 * Card de comunidade compartilhado entre a listagem pública (Comunidades)
 * e a listagem do usuário (MinhasComunidades). O miolo — monograma, nome,
 * autoria, selo único, descrição e barra de lotação — é sempre igual; o que
 * muda é o rodapé, que cada página passa via children.
 *
 * O resto das props cai direto no <article> — é assim que as páginas marcam
 * o card com `data-revelar` sem um wrapper extra, que quebraria o `:nth-child`
 * da cascata no CSS.
 *
 * `user` é opcional: só o usa para decidir o selo de denúncia (admin). Quando
 * a página não passa (MinhasComunidades), o selo simplesmente não aparece.
 */

// Iniciais do nome para o monograma (uma ou duas letras).
function iniciais(nome = '') {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function CardComunidade({ comunidade, children, user, ...rest }) {
  const oficial = comunidade.criada_por_sistema;
  const desativada = comunidade.em_manutencao;
  const membro = comunidade.usuario_participa;

  // Precedência do selo, nunca dois: denúncia (só admin, só se houver) →
  // desativada → oficial.
  const temDenuncia = Boolean(user?.is_superuser) && (comunidade.total_denuncias || 0) > 0;
  let selo = null;
  if (temDenuncia) {
    selo = (
      <span className="comunidade-selo comunidade-selo--denuncia">
        <i className="fa-solid fa-flag" aria-hidden="true"></i>
        {comunidade.total_denuncias}
      </span>
    );
  } else if (desativada) {
    selo = (
      <span className="comunidade-selo comunidade-selo--desativada">
        <i className="fa-solid fa-power-off" aria-hidden="true"></i>Desativada
      </span>
    );
  } else if (oficial) {
    selo = (
      <span className="comunidade-selo comunidade-selo--oficial">
        <i className="fa-solid fa-check" aria-hidden="true"></i>Oficial
      </span>
    );
  }

  // Autoria: institucional nas oficiais; nas demais, username rastreável ou
  // fallback explícito para registros legados sem criador associado.
  let autoria = null;
  if (oficial) {
    autoria = <span className="comunidade-autoria">Criado por Sistema do ParaBook</span>;
  } else if (comunidade.criador_nome) {
    const conteudo = (
      <>Criado por <span className="comunidade-autoria-nome">@{comunidade.criador_nome}</span></>
    );
    autoria = comunidade.criador_perfil_clicavel ? (
      <Link to={`/perfil/${comunidade.criador_nome}`} className="comunidade-autoria comunidade-autoria--link">
        {conteudo}
      </Link>
    ) : (
      <span className="comunidade-autoria">{conteudo}</span>
    );
  } else {
    autoria = <span className="comunidade-autoria">Criado por <CriadorDesconhecido /></span>;
  }

  // Lotação: só renderiza com max_participantes. Aperta (roxo→vela) a partir
  // de 85%; "lotada" em 100%.
  const max = comunidade.max_participantes;
  const total = comunidade.total_membros || 0;
  const pct = max ? Math.min(100, Math.round((total / max) * 100)) : 0;
  const apertando = pct >= 85;
  const rotuloPct = pct >= 100 ? 'lotada' : pct >= 85 ? 'quase cheia' : `${pct}%`;

  const classes = ['card-comunidade'];
  if (oficial) classes.push('is-oficial');
  if (desativada) classes.push('is-desativada');
  if (membro) classes.push('is-membro');

  return (
    <article className={classes.join(' ')} {...rest}>
      <div className="comunidade-topo">
        <span
          className={`comunidade-monograma${oficial ? ' comunidade-monograma--oficial' : ''}`}
          aria-hidden="true"
        >
          {iniciais(comunidade.nome)}
        </span>
        <div className="comunidade-identidade">
          <h3 className="comunidade-nome" title={comunidade.nome}>{comunidade.nome}</h3>
          {autoria}
        </div>
        {selo}
      </div>

      <p className="comunidade-descricao">{comunidade.descricao}</p>

      {max ? (
        <div className="comunidade-lotacao">
          <div className="comunidade-lotacao-linha">
            <span>{total} de {max} membros</span>
            <span className={`comunidade-lotacao-pct${apertando ? ' is-apertando' : ''}`}>{rotuloPct}</span>
          </div>
          <div
            className={`comunidade-lotacao-barra${apertando ? ' is-apertando' : ''}`}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Lotação de ${comunidade.nome}`}
          >
            <span style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}

      <div className="comunidade-footer">{children}</div>
    </article>
  );
}

export default CardComunidade;
