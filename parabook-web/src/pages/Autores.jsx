import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/autores.css';

function Autores() {
  const [termoBusca, setTermoBusca] = useState('');
  const [autores, setAutores] = useState([]);
  const [loading, setLoading] = useState(true);
  const paginaRef = useRevelacao([autores, termoBusca, loading]);

  useEffect(() => {
    api.get('/perfis/autores/')
      .then(res => setAutores(res.data))
      .catch(err => console.error("Erro ao carregar autores:", err))
      .finally(() => setLoading(false));
  }, []);

  const autoresFiltrados = autores.filter(autor => 
    autor.nome.toLowerCase().includes(termoBusca.toLowerCase()) || 
    autor.username.toLowerCase().includes(termoBusca.toLowerCase())
  );

  return (
    <main className="container-autores authors-page" id="conteudo-principal" ref={paginaRef}>

      <header className="header-autores" data-revelar>
        <div className="header-content">
          <span className="header-badge">Comunidade Literária</span>
          <h1>Conheça Nossos Autores</h1>
          <p>Explore o perfil, as biografias e descubra o acervo de obras publicadas pelos grandes nomes e talentos independentes do Parabook.</p>
        </div>
      </header>

      <section className="acoes-barra-container" aria-label="Filtros e Ações" data-revelar>
        <form onSubmit={(e) => e.preventDefault()} className="form-busca-autores">
          <div className="input-grupo-busca">
            <i className="fa-solid fa-magnifying-glass icone-busca"></i>
            <input 
              type="text" 
              name="busca" 
              id="input-busca-autores" 
              placeholder="Buscar autor por nome..." 
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              aria-label="Buscar autor por nome" 
            />
            {termoBusca && (
              <button type="button" className="btn-limpar-busca" title="Limpar busca" aria-label="Limpar busca" onClick={() => setTermoBusca('')}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>
          <button type="submit" className="btn-buscar-autores">Pesquisar</button>
        </form>
      </section>

      <section className="grid-autores" aria-label="Lista de autores" data-revelar-cascata>
        {autoresFiltrados.length > 0 ? (
          autoresFiltrados.map(autor => (
            <article key={autor.id} className="card-autor" data-revelar>
              <div className="card-header-decoracao"></div>
              
              <div className="avatar-autor-container">
                {autor.foto ? (
                  <img
                    src={autor.foto}
                    alt={`Foto de ${autor.nome}`}
                    className="foto-autor"
                    loading="lazy"
                    decoding="async"
                    width="96"
                    height="96"
                  />
                ) : (
                  <div className="foto-autor-placeholder">
                    <i className="fa-solid fa-user-nib"></i>
                  </div>
                )}
              </div>

              <div className="info-autor-card">
                <h2 className="nome-autor">{autor.nome}</h2>
                
                <span className="badge-obras">
                  <i className="fa-solid fa-book-bookmark"></i> {autor.total_obras} {autor.total_obras === 1 ? 'obra' : 'obras'}
                </span>

                <p className="biografia-autor-resumo">
                  {autor.biografia ? (
                    autor.biografia.length > 110 ? autor.biografia.substring(0, 110) + '...' : autor.biografia
                  ) : (
                    "Membro colaborador do acervo ParaBook. Explore suas obras publicadas abaixo."
                  )}
                </p>
                
                <div className="acoes-autor-card">
                  <Link to="/biblioteca" className="btn-autor-obras" title={`Ver livros publicados por ${autor.nome}`}>
                    <i className="fa-solid fa-bookmark"></i> Ver Obras
                  </Link>
                </div>
              </div>
            </article>
          ))
        ) : (
          <div className="empty-state-autores authors-empty" data-revelar>
            <i className="fa-solid fa-feather"></i>
            <h3>Nenhum escritor encontrado</h3>
            <p>Não encontramos autores correspondentes ao termo "{termoBusca}".</p>
            <button className="btn-ghost mt-3" onClick={() => setTermoBusca('')}>
              Ver todos os autores
            </button>
          </div>
        )}
      </section>

    </main>
  );
}

export default Autores;
