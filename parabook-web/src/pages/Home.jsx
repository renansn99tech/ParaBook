import { Link } from 'react-router-dom'
import '../assets/css/home.css'
import openBookImg from '../assets/img/open-book.png'
import leitoraImg from '../assets/img/leitora.png'
import autorImg from '../assets/img/autor.png'

function Home() {
  // Dados estáticos temporários (substituiremos por chamadas à API via Axios em breve)
  const username = "Visitante";
  const isAuthenticated = false;
  
  const livrosRecentes = [
    { id: 1, titulo: "O Senhor dos Anéis", autor: "J.R.R. Tolkien", genero: "Fantasia", avaliacao: "4.9", capa_url: null },
    { id: 2, titulo: "Duna", autor: "Frank Herbert", genero: "Ficção Científica", avaliacao: "4.8", capa_url: null },
    { id: 3, titulo: "1984", autor: "George Orwell", genero: "Distopia", avaliacao: "4.7", capa_url: null },
    { id: 4, titulo: "O Alquimista", autor: "Paulo Coelho", genero: "Aventura", avaliacao: "4.6", capa_url: null },
  ];

  return (
    <main>
      <section className="hero">
        <div className="hero-content">
          <h1>Descubra, leia e publique <span>histórias</span></h1>
          <p>
            Conectamos leitores, autores e comunidades em um único espaço para
            compartilhar conhecimento e incentivar a leitura.
          </p>

          <div className="hero-buttons">
            <Link to="/biblioteca" className="btn-primary">
              <i className="fa-solid fa-book-open"></i> Explorar livros
            </Link>

            <Link to="/publicar" className="btn-secondary">
              <i className="fa-solid fa-feather"></i> Publicar meu livro
            </Link>
          </div>
        </div>

        <div className="hero-image">
          <div className="floating-card author-card">
            <div className="floating-user">
              <div className="floating-avatar">👩</div>
              <div>
                <h4>{isAuthenticated ? username : 'Visitante'}</h4>
                <span>{isAuthenticated ? 'user@email.com' : 'Leitor'}</span>
              </div>
            </div>
            <div className="mini-chart"><span></span></div>
          </div>

          <div className="floating-card story-card">
            <div className="floating-book-placeholder">
              <i className="fa-solid fa-book"></i>
            </div>
            <div className="story-info">
              <h4>Nenhuma leitura</h4>
              <span>Comece um livro</span>
            </div>
            <i className="fa-solid fa-star"></i>
          </div>

          <div className="floating-card stats-card">
            <h4>Estatísticas</h4>
            <span>Leituras</span>
            <strong>+500</strong>
            <div className="mini-chart chart-large"><span></span></div>
          </div>

          <img src={openBookImg} alt="Livro Aberto" />
        </div>
      </section>

      <section className="features">
        <div className="feature-card">
          <div className="feature-content">
            <div className="feature-icon">📚</div>
            <h2>Para Leitores</h2>
            <p>Explore milhares de livros, descubra novos autores e participe de comunidades literárias.</p>
            <ul>
              <li>✔ Biblioteca Digital</li>
              <li>✔ Livros Gratuitos</li>
              <li>✔ Comunidades</li>
              <li>✔ Favoritos</li>
            </ul>
          </div>
          <div className="feature-photo">
            <img src={leitoraImg} alt="Leitora" />
          </div>
        </div>

        <div className="feature-card">
          <div className="feature-content">
            <div className="feature-icon">
              <i className="fa-solid fa-feather"></i>
            </div>
            <h2>Para Autores</h2>
            <p>Compartilhe suas obras, alcance novos leitores e faça parte da comunidade ParaBook.</p>
            <ul>
              <li>✔ Publicação Gratuita</li>
              <li>✔ Divulgação</li>
              <li>✔ Feedback</li>
              <li>✔ Comunidade</li>
            </ul>
          </div>
          <div className="feature-photo">
            <img src={autorImg} alt="Autor" />
          </div>
        </div>
      </section>

      <section>
        <div className="row row-cols-1 row-cols-sm-2 row-cols-md-3 row-cols-lg-4 g-4" style={{ padding: '0 2rem' }}>
          {livrosRecentes.map(livro => (
            <div className="col" key={livro.id}>
              <div className="card h-100 book-card-modern border-0 shadow-sm" style={{ background: 'linear-gradient(145deg, rgba(16,25,45,0.9), rgba(16,25,45,0.6))', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div className="book-cover-wrapper position-relative" style={{ aspectRatio: '2/3', overflow: 'hidden', borderRadius: '6px 6px 0 0' }}>
                  <div className="capa-placeholder-modern d-flex flex-column align-items-center justify-content-center h-100 bg-dark">
                    <i className="fa-solid fa-book fa-3x text-muted mb-2"></i>
                    <small className="text-muted text-uppercase">Sem Capa</small>
                  </div>
                  <div className="book-badge-rating position-absolute top-0 end-0 m-2 bg-dark text-warning px-2 py-1 rounded shadow-sm" style={{ zIndex: 10 }}>
                    <i className="fa-solid fa-star me-1"></i>{livro.avaliacao}
                  </div>
                </div>

                <div className="card-body d-flex flex-column p-3">
                  <h3 className="card-title h6 text-truncate mb-1" style={{ color: 'white' }}>
                    {livro.titulo}
                  </h3>
                  <p className="card-text small text-muted text-truncate mb-3">
                    {livro.autor}
                  </p>
                  <div className="mt-auto">
                    <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1 rounded-pill small">
                      {livro.genero}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      
      <section className="cta" style={{ textAlign: 'center', margin: '4rem 0' }}>
        <h2>Tem uma história para contar?</h2>
        <p>Compartilhe sua obra gratuitamente e alcance novos leitores através da comunidade ParaBook.</p>
        <Link to="/publicar" className="btn-primary">Publicar Minha Obra</Link>
      </section>
    </main>
  )
}

export default Home
