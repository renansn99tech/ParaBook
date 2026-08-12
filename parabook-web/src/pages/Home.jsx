import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import useRevelacao from '../hooks/useRevelacao';
import useProgressoScroll from '../hooks/useProgressoScroll';
import '../assets/css/home.css';
import '../assets/css/home-ceus.css';
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

  // Publica --progresso (0 a 1) na .jornada conforme ela atravessa a tela.
  const jornadaRef = useProgressoScroll();

  // Marca o <html> enquanto a landing está no ar. É o que autoriza as
  // regras de home-ceus.css a valerem — e a remoção no cleanup é o que
  // impede o tema da Home de sobreviver à navegação para /biblioteca,
  // /perfil e demais telas, que continuam só com o data-tema.
  useEffect(() => {
    document.documentElement.setAttribute('data-home', '');
    return () => document.documentElement.removeAttribute('data-home');
  }, []);

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
      {/* O wrapper existe para DELIMITAR o alcance do fundo grudado: um
          sticky solta ao acabar o próprio pai, então envolver só hero +
          jornada faz a nebulosa acompanhar os dois e liberar a página
          justamente onde a narrativa termina. Antes o pai era a
          .home-page inteira e o brilho seguia até o rodapé. */}
      <div className="jornada-wrapper">
        <div className="home-cosmos-layer" aria-hidden="true"></div>

        <section className="hero">
        <div className="hero-cosmos" aria-hidden="true"></div>

        <div className="hero-content">
          <p className="hero-eyebrow">Biblioteca digital independente</p>

          <h1>Leia fundo. Publique <span>alto</span>.</h1>

          <p className="hero-lead">
            Descubra obras independentes, leia sem sair do navegador e publique a sua.
          </p>

          <div className="hero-buttons">
            <Link to="/biblioteca" className="btn-primary">
              <i className="fa-solid fa-book-open"></i> Explorar livros
            </Link>

            <Link to="/publicar" className="btn-secondary">
              <i className="fa-solid fa-feather"></i> Publicar minha obra
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

        {/* ATO 2 — a jornada. O cenário fica preso na tela enquanto os
            capítulos passam por cima dele; quem diz "onde estamos" é o
            --progresso escrito por useProgressoScroll, e todo o resto
            (giro da página, troca de nebulosa, paisagem) é CSS lendo
            essa variável. */}
        <section className="jornada" ref={jornadaRef}>
          <div className="jornada-cena" aria-hidden="true">
            <div className="cena-nebulosa"></div>
            <div className="cena-ceu-dia"></div>
            <div className="cena-ceu-tarde"></div>

            <div className="cena-estrelas"></div>
            <div className="cena-estrelas-dia"></div>
            <div className="cena-estrelas-tarde"></div>

            <div className="cena-cometa"></div>
            <div className="cena-horizonte"></div>
            <div className="cena-astro"></div>

            <div className="cena-lua-crescente">
              <div className="cena-lua-crescente-halo"></div>
              <div className="cena-lua-crescente-disco"></div>
            </div>

            <div className="cena-sol-dia"></div>

            <div className="cena-cirros">
              <div className="cena-cirro cena-cirro-1"></div>
              <div className="cena-cirro cena-cirro-2"></div>
              <div className="cena-cirro cena-cirro-3"></div>
            </div>

            <div className="cena-nuvens-tarde">
              <div className="cena-nuvem cena-nuvem-1"></div>
              <div className="cena-nuvem cena-nuvem-2"></div>
              <div className="cena-nuvem cena-nuvem-3"></div>
            </div>

            <div className="cena-arcos">
              <div className="cena-arco cena-arco-1"><span></span></div>
              <div className="cena-arco cena-arco-2"><span></span></div>
              <div className="cena-arco cena-arco-3"></div>
            </div>
            <div className="cena-aurora">
              <div className="cena-fita cena-fita-roxa"></div>
              <div className="cena-fita cena-fita-vela"></div>
            </div>

            {/* Camada só para o gate de visibilidade (--progresso): a
                estrela cadente em si roda num loop ambiente que não sabe
                nada de scroll — ver comentário em .cena-estrela-cadente. */}
            <div className="cena-cadente-camada">
              <div className="cena-estrela-cadente"></div>
              <div className="cena-estrela-cadente cena-estrela-cadente-b"></div>
            </div>

            {/* Antes dos campos no DOM: é isso que faz o sol se pôr ATRÁS
                do relevo em vez de flutuar sobre ele. */}
            <div className="cena-sol-tarde"></div>

            <div className="cena-livro">
              <img src={openBookImg} alt="" />
            </div>

            <div className="cena-paisagem-noite">
              <div className="cena-morro cena-campo-noite-3"></div>
              <div className="cena-morro cena-campo-noite-2"></div>
              <div className="cena-morro cena-campo-noite-1"><div className="cena-campo-linhas-noite"></div></div>
            </div>

            <div className="cena-paisagem-tarde">
              <div className="cena-morro cena-campo-tarde-3"></div>
              <div className="cena-morro cena-campo-tarde-2"></div>
              <div className="cena-morro cena-campo-tarde-1"><div className="cena-campo-linhas-tarde"></div></div>
            </div>

            <div className="cena-paisagem-dia">
              <div className="cena-morro cena-campo-3"></div>
              <div className="cena-morro cena-campo-2"></div>
              <div className="cena-morro cena-campo-1"><div className="cena-campo-linhas"></div></div>
            </div>
          </div>

          <div className="jornada-textos">
          <article className="jornada-capitulo" data-revelar>
            <p className="capitulo-rotulo">Descubra</p>
            <h2>O acervo aprende com o que você lê</h2>
            <p className="capitulo-texto">Sem formulário de preferências — cada obra aberta afina a próxima recomendação.</p>
          </article>

          <article className="jornada-capitulo alinhado-direita" data-revelar>
            <p className="capitulo-rotulo">Publique</p>
            <h2>Do manuscrito à vitrine, sem intermediário</h2>
            <p className="capitulo-texto">Autores independentes sobem a obra e ganham uma página própria, sem fila de editora.</p>
          </article>

          <article className="jornada-capitulo" data-revelar>
            <p className="capitulo-rotulo">Pertença</p>
            <h2>A conversa continua depois da última página</h2>
            <p className="capitulo-texto">Comunidades por gênero e por obra — o livro fechado é onde a discussão começa.</p>
          </article>

          {/* ATO 3 — o convite. Fecha a jornada ainda sobre o cenário,
              com entrada própria: é o clímax, não mais um capítulo. */}
          <div className="jornada-convite" data-revelar>
            <h2>Sua obra é o próximo capítulo</h2>
            <p className="capitulo-texto">
              A publicação é gratuita e leva minutos. O resto é com os leitores.
            </p>

            <Link to="/publicar" className="btn-primary convite-cta">
              <i className="fa-solid fa-feather"></i> Publicar minha obra
            </Link>
          </div>
          </div>
        </section>
      </div>

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
                {/* Sem o atalho "i" aqui de propósito: nesta seção os cards
                    são uma amostra, e quem leva ao acervo é o "Ver mais" do
                    cabeçalho. O botão continua nos cards de /biblioteca e
                    /biblioteca/novidade, onde a ação é abrir a obra. */}
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

        {/* O CTA de publicar que ficava aqui saiu: o convite ao fim da
            jornada (.jornada-convite) faz o mesmo pedido, com mais
            destaque e no momento certo da narrativa. Dois convites para
            a mesma ação na mesma página competiam entre si. */}
      </section>
    </main>
  )
}

export default Home
