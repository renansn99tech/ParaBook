import { Link } from 'react-router-dom';
import openBook480 from '../../assets/img/open-book-480.webp';
import '../../assets/css/home-mobile.css';

function LivroCard({ livro }) {
  return (
    <article className="hm-card hm-book-card">
      <div className="hm-cover">
        {livro.capa_url ? (
          <img
            src={livro.capa_url}
            alt={`Capa do livro ${livro.titulo}`}
            width="300"
            height="420"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <i className="fa-solid fa-book" aria-hidden="true"></i>
        )}
      </div>
      <div className="hm-card-body">
        <p className="hm-label">Novidade</p>
        <h3>{livro.titulo}</h3>
        <p>{livro.autor}</p>
        <Link to={`/livro/${livro.id}`} aria-label={`Ver detalhes de ${livro.titulo}`}>
          Ver detalhes <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
        </Link>
      </div>
    </article>
  );
}

function HomeMobile({ user, novidades, comunidadesOficiais, loading, erro }) {
  return (
    <main className="home-mobile">
      <div className="hm-intro-cosmos">
        <section className="hm-hero" aria-labelledby="hm-title">
        <div className="hm-hero-copy">
          <p className="hm-eyebrow">Literatura independente, em qualquer tela</p>
          <h1 id="hm-title">Sua próxima história começa aqui.</h1>
          <p className="hm-lead">Descubra novas vozes, leia no navegador e encontre pessoas que amam os mesmos livros.</p>

          <div className="hm-actions">
            <Link to="/biblioteca" className="hm-button hm-button-primary">
              Explorar livros <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
            </Link>
            <Link to={user ? '/minha-biblioteca' : '/register'} className="hm-button hm-button-secondary">
              {user ? 'Continuar lendo' : 'Criar conta gratuita'}
            </Link>
          </div>
        </div>

        <div className="hm-hero-art" aria-hidden="true">
          <div className="hm-orbit"></div>
          <img src={openBook480} alt="" width="480" height="320" fetchPriority="high" />
        </div>
        </section>

        <nav className="hm-quick" aria-label="Atalhos da página inicial">
          <Link to="/biblioteca"><i className="fa-solid fa-book-open" aria-hidden="true"></i><span>Acervo</span></Link>
          <Link to="/comunidades"><i className="fa-solid fa-people-group" aria-hidden="true"></i><span>Comunidades</span></Link>
          <Link to="/autores"><i className="fa-solid fa-feather" aria-hidden="true"></i><span>Autores</span></Link>
        </nav>
      </div>

      <section className="hm-section" aria-labelledby="hm-novidades">
        <div className="hm-section-heading">
          <div>
            <p className="hm-label">Chegaram agora</p>
            <h2 id="hm-novidades">Novidades para ler</h2>
          </div>
          <Link to="/biblioteca/novidade">Ver todas</Link>
        </div>

        {loading && <p className="hm-status" role="status">Carregando novidades...</p>}
        {erro && <p className="hm-status" role="alert">{erro}</p>}
        {!loading && !erro && novidades.length === 0 && <p className="hm-status">Novas obras aparecerão aqui em breve.</p>}
        {novidades.length > 0 && (
          <div className="hm-rail" aria-label="Livros recentes">
            {novidades.map((livro) => <LivroCard key={livro.id} livro={livro} />)}
          </div>
        )}
      </section>

      <section className="hm-section hm-community-section" aria-labelledby="hm-comunidades">
        <div className="hm-section-heading">
          <div>
            <p className="hm-label">Converse sobre livros</p>
            <h2 id="hm-comunidades">Comunidades oficiais</h2>
          </div>
          <Link to="/comunidades">Explorar</Link>
        </div>

        <div className="hm-community-list">
          {comunidadesOficiais.map((comunidade) => (
            <Link to={`/comunidade/${comunidade.id}/conteudo`} className="hm-community" key={comunidade.id}>
              <span className="hm-community-icon"><i className="fa-solid fa-users" aria-hidden="true"></i></span>
              <span>
                <strong>{comunidade.nome}</strong>
                <small>{comunidade.descricao || 'Um espaço para conversar e descobrir novas leituras.'}</small>
              </span>
              <i className="fa-solid fa-chevron-right" aria-hidden="true"></i>
            </Link>
          ))}
          {!loading && comunidadesOficiais.length === 0 && <p className="hm-status">As comunidades oficiais estão sendo preparadas.</p>}
        </div>
      </section>

      <section className="hm-publish" aria-labelledby="hm-publish-title">
        <p className="hm-label">Para autores independentes</p>
        <h2 id="hm-publish-title">Sua obra merece encontrar leitores.</h2>
        <p>Envie seu livro, acompanhe a publicação e construa sua comunidade.</p>
        <Link to="/publicar" className="hm-button hm-button-primary">Publicar minha obra</Link>
      </section>
    </main>
  );
}

export default HomeMobile;
