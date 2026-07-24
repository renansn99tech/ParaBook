import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import '../assets/css/home.css';
import openBookImg from '../assets/img/open-book.png';
import leitoraImg from '../assets/img/leitora.png';
import autorImg from '../assets/img/autor.png';

function Home() {
  const { user } = useContext(AuthContext);
  const isAuthenticated = !!user;
  
  const [novidades, setNovidades] = useState([]);
  const [comunidadesOficiais, setComunidadesOficiais] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [livrosRes, comunidadesRes] = await Promise.all([
          api.get('/biblioteca/livros/'),
          api.get('/comunidades/comunidades/')
        ]);

        const livrosData = livrosRes.data.results || livrosRes.data;
        const comunidadesData = comunidadesRes.data.results || comunidadesRes.data;

        const recentes = livrosData.slice(0, 3);
        setNovidades(recentes);

        const oficiais = comunidadesData.filter(c => c.criada_por_sistema).slice(0, 3);
        setComunidadesOficiais(oficiais);
      } catch (error) {
        console.error("Erro ao buscar dados da Home:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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
                <h4 style={{ fontSize: '0.8rem', marginBottom: '2px' }}>{isAuthenticated ? user.username : 'Visitante'}</h4>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  {isAuthenticated 
                    ? (user.tipo === 'admin' ? 'Administrador' 
                      : user.tipo === 'autor' ? 'Autor' 
                      : user.tipo === 'aguardando_aprovacao' ? 'Em Análise' 
                      : 'Leitor') 
                    : 'Leitor'}
                </span>
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

      <section className="communities container my-5">
        <div className="section-header">
          <h2>Novidades</h2>
          <Link to="/biblioteca/novidade" className="btn-ver-mais-news">
            Ver mais <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>

        <div className="novidades-grid">
          {novidades.length > 0 ? (
            novidades.map(livro => (
              <article className="book-card card-novidade-evolved" key={livro.id}>
                <Link
                  to={`/biblioteca/livro/${livro.id}`}
                  className="btn-info-livro"
                  title="Ver Informações"
                  style={{ zIndex: 20 }}
                >
                  <i className="fa-solid fa-info"></i>
                </Link>
                <div className="book-capa-wrapper">
                  {livro.capa_url ? (
                    <img
                      src={livro.capa_url}
                      alt={`Capa do livro ${livro.titulo}`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="capa-placeholder">
                      <i className="fa-solid fa-book"></i>
                    </div>
                  )}
                  <span className="badge-novidade">Novo</span>
                </div>

                <div className="book-info">
                  <h3>{livro.titulo}</h3>
                  <p className="book-author">{livro.autor}</p>
                  <div className="book-rating"><i className="fa-solid fa-star"></i> {livro.avaliacao || '5.0'}</div>
                </div>
              </article>
            ))
          ) : (
            !loading && (
              <div className="col-fallback">
                <p>Nenhuma obra recente adicionada no momento.</p>
              </div>
            )
          )}
        </div>

        <div className="section-title-wrapper" style={{ marginTop: '80px' }}>
          <h2 className="section-title">Comunidades Oficiais</h2>
          <p className="section-subtitle">
            Participe dos nossos espaços exclusivos de debate literário.
          </p>
        </div>

        <div className="novidades-grid" style={{ marginBottom: '60px' }}>
          {comunidadesOficiais.length > 0 ? (
            comunidadesOficiais.map(comunidade => (
              <article
                key={comunidade.id}
                className="book-card card-novidade-evolved"
                style={{
                  padding: '30px 20px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    width: '70px',
                    height: '70px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                  }}
                >
                  <i
                    className="fa-solid fa-users"
                    style={{ color: '#8b5cf6', fontSize: '1.8rem' }}
                  ></i>
                </div>
                <h3 style={{ fontSize: '1.3rem', marginBottom: '10px', color: 'white' }}>
                  {comunidade.nome}
                </h3>
                <p
                  style={{
                    fontSize: '0.95rem',
                    color: 'var(--text-secondary)',
                    marginBottom: '25px',
                    lineHeight: '1.5',
                  }}
                >
                  {comunidade.descricao && comunidade.descricao.length > 90
                    ? comunidade.descricao.substring(0, 90) + '...'
                    : comunidade.descricao}
                </p>

                <Link
                  to="/comunidades"
                  className="btn-outline"
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    padding: '10px',
                    textAlign: 'center',
                    color: '#c4b5fd',
                    borderColor: 'rgba(139, 92, 246, 0.4)',
                    border: '1px solid',
                    textDecoration: 'none'
                  }}
                >
                  Explorar Sala
                </Link>
              </article>
            ))
          ) : (
            !loading && (
              <div className="col-fallback">
                <p>Nenhuma comunidade oficial configurada no momento.</p>
              </div>
            )
          )}
        </div>

        <div className="cta" style={{ textAlign: 'center', margin: '4rem 0' }}>
          <h2>Tem uma história para contar?</h2>
          <p>Compartilhe sua obra gratuitamente e alcance novos leitores através da comunidade ParaBook.</p>
          <Link to="/publicar" className="btn-primary">Publicar Minha Obra</Link>
        </div>
      </section>
    </main>
  )
}

export default Home
