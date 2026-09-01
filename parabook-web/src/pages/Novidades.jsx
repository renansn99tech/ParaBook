import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/novidade.css';

function Novidades() {
  const [livros, setLivros] = useState([]);
  const [loading, setLoading] = useState(true);
  const paginaRef = useRevelacao([livros, loading]);

  useEffect(() => {
    const fetchLivros = async () => {
      try {
        const response = await api.get('/biblioteca/livros/');
        let data = response.data.results || response.data;
        // Para garantir que são os mais recentes, pegamos os 5 últimos
        const recentes = data.sort((a, b) => b.id - a.id).slice(0, 5);
        setLivros(recentes);
      } catch (error) {
        console.error("Erro ao buscar novidades:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchLivros();
  }, []);

  return (
    <main className="news-marketing-page" id="topo" ref={paginaRef}>
      
      <div className="novidade-scroll-ticker-container">
        <div className="novidade-ticker-track">
          <span>🔥 NOVAS OBRAS INDEPENDENTES • 📚 LANÇAMENTOS NO ACERVO • 🚀 CONECTANDO ESCRITORES •</span>
          <span aria-hidden="true">🔥 NOVAS OBRAS INDEPENDENTES • 📚 LANÇAMENTOS NO ACERVO • 🚀 CONECTANDO ESCRITORES •</span>
        </div>
      </div>

      <section className="news-hero-section" data-revelar>
        <div className="news-intro-content">
          <h1 className="display-5 fw-bold mb-2">
            Novidades da Plataforma
          </h1>
          <p className="lead">
            Fique por dentro das últimas joias literárias adicionadas ao ParaBook e
            descubra novos autores antes de todo mundo.
          </p>
        </div>
      </section>

      <div className="container py-2 news-content">
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        ) : livros.length > 0 ? (
          <div className="novidades-grid" data-revelar-cascata>
            {livros.map(livro => (
              <article className="book-card card-novidade-evolved" key={livro.id} data-revelar>
                <Link
                  to={`/livro/${livro.id}`}
                  className="btn-info-livro"
                  title="Ver Informações"
                >
                  <i className="fa-solid fa-info"></i>
                </Link>
                <div className="book-capa-wrapper">
                  {livro.capa_url ? (
                    <img
                      src={livro.capa_url}
                      alt={`Capa do livro ${livro.titulo}`}
                      loading="lazy"
                      decoding="async"
                      width="300"
                      height="420"
                    />
                  ) : (
                    <div className="capa-placeholder">
                      <i className="fa-solid fa-book"></i>
                    </div>
                  )}
                  <span className="badge-novidade">Novo</span>
                  {livro.selo_independente && (
                    <span className="badge-independente-novidade">
                      <i className="fa-solid fa-feather-pointed" aria-hidden="true"></i> Independente
                    </span>
                  )}
                </div>

                <div className="book-info">
                  <h3>{livro.titulo}</h3>
                  <p className="book-author">{livro.autor}</p>
                  <div className="book-rating mt-2">
                    <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1 rounded-pill small">
                      {livro.categoria_nome || "Sem categoria"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <p className="page-lead fst-italic">Nenhum lançamento disponível no momento.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default Novidades;
