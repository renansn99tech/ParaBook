import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../assets/css/novidade.css';

function Novidades() {
  const [livros, setLivros] = useState([]);
  const [loading, setLoading] = useState(true);

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
    <main className="news-marketing-page" id="topo" style={{ minHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
      
      <div className="novidade-scroll-ticker-container">
        <span className="novidade-ticker-item">
          🔥 NOVAS OBRAS INDEPENDENTES • 📚 LANÇAMENTOS NO ACERVO • 🚀 CONECTANDO ESCRITORES • 
          🔥 NOVAS OBRAS INDEPENDENTES • 📚 LANÇAMENTOS NO ACERVO • 🚀 CONECTANDO ESCRITORES •
        </span>
      </div>

      <section className="news-hero-section" style={{ padding: '30px 20px', textAlign: 'center' }}>
        <div className="news-intro-content" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 className="display-5 fw-bold mb-2" style={{ color: 'var(--text)', fontSize: '2.5rem' }}>
            Novidades da Plataforma
          </h1>
          <p className="lead" style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
            Fique por dentro das últimas joias literárias adicionadas ao ParaBook e
            descubra novos autores antes de todo mundo.
          </p>
        </div>
      </section>

      <div className="container py-2" style={{ maxWidth: '1400px', flex: 1 }}>
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Carregando...</span>
            </div>
          </div>
        ) : livros.length > 0 ? (
          <div className="novidades-grid" style={{ justifyContent: 'center' }}>
            {livros.map(livro => (
              <article className="book-card card-novidade-evolved" key={livro.id}>
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
                  <div className="book-rating mt-2">
                    <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle px-2 py-1 rounded-pill small">
                      {livro.categoria_nome || "Independente"}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="text-center py-5">
            <p className="text-muted fst-italic">Nenhum lançamento catalogado nas últimas horas.</p>
          </div>
        )}
      </div>
    </main>
  );
}

export default Novidades;
