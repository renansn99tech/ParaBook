import { Link } from 'react-router-dom';
import '../assets/css/home-personalizada.css';

function Descoberta({ livro }) {
  return (
    <Link to={livro.link} className="proximo-descoberta">
      <span className="proximo-capa">
        {livro.capa
          ? <img src={livro.capa} alt="" width="64" height="88" loading="lazy" decoding="async" />
          : <i className="fa-solid fa-book" aria-hidden="true"></i>}
      </span>
      <span className="proximo-livro-copy">
        <strong>{livro.titulo}</strong>
        <small>{livro.autor}</small>
        <span>{livro.motivo}</span>
      </span>
      <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
    </Link>
  );
}

function ProximoCapitulo({ dados, carregando, erro }) {
  const descobertas = dados?.descobertas || [];
  const acao = dados?.proxima_acao;

  return (
    <section className="proximo-capitulo" aria-labelledby="proximo-capitulo-title">
      <header className="proximo-heading">
        <div>
          <p>Área pessoal</p>
          <h2 id="proximo-capitulo-title">Seu próximo capítulo</h2>
        </div>
        <span>Conteúdo privado e adaptado à sua conta</span>
      </header>

      {carregando && <div className="proximo-status" role="status">Organizando suas próximas ações...</div>}
      {!carregando && erro && <div className="proximo-status" role="alert">{erro}</div>}

      {!carregando && !erro && <div className="proximo-grid">
        <article className="proximo-card proximo-card--descobertas">
          <div className="proximo-card-heading">
            <span className="proximo-card-icon"><i className="fa-solid fa-compass" aria-hidden="true"></i></span>
            <div><p>Descobertas para você</p><h3>Novas possibilidades para sua estante</h3></div>
          </div>
          <p className="proximo-criterio">{dados?.criterio_descobertas}</p>
          <div className="proximo-lista">
            {descobertas.map((livro) => <Descoberta key={livro.id} livro={livro} />)}
            {descobertas.length === 0 && <div className="proximo-vazio"><p>O acervo ainda não possui uma obra fora da sua estante para sugerir.</p><Link to="/biblioteca">Revisitar o acervo</Link></div>}
          </div>
        </article>

        <article className={`proximo-card proximo-card--acao proximo-card--${acao?.tipo || 'padrao'}`}>
          <div className="proximo-card-heading">
            <span className="proximo-card-icon"><i className="fa-solid fa-arrow-trend-up" aria-hidden="true"></i></span>
            <div><p>{acao?.rotulo || 'Próximo passo'}</p><h3>{acao?.titulo || 'Sua jornada continua'}</h3></div>
          </div>
          {typeof acao?.destaque === 'number' && <strong className="proximo-destaque" aria-label={`${acao.destaque} itens aguardando atenção`}>{acao.destaque}</strong>}
          <p className="proximo-descricao">{acao?.descricao || 'Explore os recursos disponíveis para sua conta.'}</p>
          <Link to={acao?.link || '/perfil'} className="proximo-cta">{acao?.cta || 'Abrir meu perfil'} <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link>
        </article>
      </div>}
    </section>
  );
}

export default ProximoCapitulo;
