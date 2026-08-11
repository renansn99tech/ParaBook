import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import useRevelacao from '../hooks/useRevelacao';
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

  // Os cards de novidades e comunidades só existem depois da resposta da
  // API, então o hook precisa saber quando reobservar o que nasceu tarde.
  const paginaRef = useRevelacao([novidades, comunidadesOficiais]);

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
    <main className="home-page" ref={paginaRef}>
      <section className="hero">
        <div className="hero-cosmos" aria-hidden="true"></div>

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
          <div className="hero-orbit" aria-hidden="true">
            <div className="hero-orbit-ring hero-orbit-ring-1">
              <span className="hero-orbit-dot"></span>
              <span className="hero-orbit-dot"></span>
            </div>
            <div className="hero-orbit-ring hero-orbit-ring-2">
              <span className="hero-orbit-dot"></span>
              <span className="hero-orbit-dot"></span>
              <span className="hero-orbit-dot"></span>
            </div>
            <div className="hero-orbit-ring hero-orbit-ring-3">
              <span className="hero-orbit-dot"></span>
              <span className="hero-orbit-dot"></span>
              <span className="hero-orbit-dot"></span>
              <span className="hero-orbit-dot"></span>
            </div>
          </div>

          <img src={openBookImg} alt="Livro Aberto" />

          <div className="floating-card author-card">
            <div className="floating-user">
              <div className="floating-avatar">👩</div>
              <div>
                <h4 className="visitante-nome">{isAuthenticated ? user.username : 'Visitante'}</h4>
                <span className="visitante-papel">
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
        </div>
      </section>

      <section className="features" data-revelar-cascata>
        <div className="feature-card" data-revelar>
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

        <div className="feature-card" data-revelar>
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
        <div className="section-header" data-revelar>
          <h2>Novidades</h2>
          <Link to="/biblioteca/novidade" className="btn-ver-mais-news">
            Ver mais <i className="fa-solid fa-arrow-right"></i>
          </Link>
        </div>

        <div className="novidades-grid" data-revelar-cascata>
          {novidades.length > 0 ? (
            novidades.map(livro => (
              <article className="book-card card-novidade-evolved" key={livro.id} data-revelar>
                <Link
                  to={`/livro/${livro.id}`}
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

        <div className="section-title-wrapper afastado" data-revelar>
          <h2 className="section-title">Comunidades Oficiais</h2>
          <p className="section-subtitle">
            Participe dos nossos espaços exclusivos de debate literário.
          </p>
        </div>

        <div className="novidades-grid com-folga" data-revelar-cascata>
          {comunidadesOficiais.length > 0 ? (
            comunidadesOficiais.map(comunidade => (
              <article
                key={comunidade.id}
                className="book-card card-novidade-evolved card-comunidade-oficial"
                data-revelar
              >
                <div className="icone">
                  <i className="fa-solid fa-users"></i>
                </div>
                <h3>
                  {comunidade.nome}
                </h3>
                <p>
                  {comunidade.descricao && comunidade.descricao.length > 90
                    ? comunidade.descricao.substring(0, 90) + '...'
                    : comunidade.descricao}
                </p>

                <Link
                  to="/comunidades"
                  className="btn-outline"
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

        <div className="cta" data-revelar>
          <h2>Tem uma história para contar?</h2>
          <p>Compartilhe sua obra gratuitamente e alcance novos leitores através da comunidade ParaBook.</p>
          <Link to="/publicar" className="btn-primary">Publicar Minha Obra</Link>
        </div>
      </section>
    </main>
  )
}

export default Home
