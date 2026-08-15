import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/minha-biblioteca.css';

function MinhaBiblioteca() {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [livros, setLivros] = useState([]);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [filtroGenero, setFiltroGenero] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const paginaRef = useRevelacao([livros, busca, filtroStatus, loading]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      const fetchEstante = async () => {
        try {
          const response = await api.get('/biblioteca/estante/');
          const estanteData = response.data.results || response.data;
          setLivros(estanteData);
        } catch (error) {
          console.error("Erro ao buscar estante:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchEstante();
    }
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="container py-4 text-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Filtragem
  const livrosFiltrados = livros.filter(item => {
    const titulo = item.livro_titulo || '';
    const autor = item.livro_autor || '';
    const matchBusca = titulo.toLowerCase().includes(busca.toLowerCase()) || autor.toLowerCase().includes(busca.toLowerCase());
    
    // Na API de estante não temos o nome da categoria mapeado por padrão no EstanteSerializer, 
    // então a busca de gênero precisaria ser adaptada. Para manter simples, omitimos ou ajustamos:
    // const matchGenero = filtroGenero ? item.livro_categoria_nome === filtroGenero : true; 
    
    const matchStatus = filtroStatus ? item.status === filtroStatus : true;
    return matchBusca && matchStatus; // Removido matchGenero temporariamente
  });

  // Estatísticas
  const totalLidos = livros.filter(l => l.status === 'lido').length;
  const lendoAgora = livros.filter(l => l.status === 'lendo').length;

  const removerLivro = async (idEstante) => {
    try {
      await api.delete(`/biblioteca/estante/${idEstante}/`);
      setLivros(livros.filter(l => l.id !== idEstante));
    } catch (error) {
      console.error("Erro ao remover da estante", error);
    }
  };

  return (
    <main className="minha-biblioteca-page" ref={paginaRef}>
      <div className="container-biblioteca">

        <header className="banner-biblioteca" data-revelar>
          <div className="banner-content">
            <h1 className="titulo-biblioteca">Minha Biblioteca</h1>
            <p>Organize sua coleção, acompanhe seus status e gerencie seu progresso de leitura em tempo real.</p>
          </div>
        </header>

        <section className="biblioteca-stats" aria-label="Estatísticas de leitura">
          <div className="stats-grid" data-revelar-cascata>
            <div className="stat-card" data-revelar>
              <div className="stat-icon"><i className="fa-solid fa-book" style={{ color: '#3b82f6' }}></i></div>
              <div className="stat-content">
                <p className="stat-label">Total de Livros</p>
                <p className="stat-value">{livros.length}</p>
              </div>
            </div>
            <div className="stat-card" data-revelar>
              <div className="stat-icon"><i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i></div>
              <div className="stat-content">
                <p className="stat-label">Concluídos</p>
                <p className="stat-value">{totalLidos}</p>
              </div>
            </div>
            <div className="stat-card" data-revelar>
              <div className="stat-icon"><i className="fa-solid fa-book-open" style={{ color: '#f59e0b' }}></i></div>
              <div className="stat-content">
                <p className="stat-label">Lendo Agora</p>
                <p className="stat-value">{lendoAgora}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="biblioteca-filters" aria-label="Filtros da coleção" data-revelar>
          <div className="filter-group">
            <input 
              type="text" 
              className="filter-input" 
              placeholder="🔍 Buscar livro por título ou autor..." 
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
            
            <select 
              className="filter-select" 
              value={filtroGenero}
              onChange={(e) => setFiltroGenero(e.target.value)}
            >
              <option value="">Todos os gêneros</option>
              <option value="ficção">Ficção</option>
              <option value="sci-fi">Sci-Fi</option>
              <option value="romance">Romance</option>
            </select>

            <select 
              className="filter-select" 
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              <option value="quero_ler">Quero ler</option>
              <option value="lendo">Lendo</option>
              <option value="lido">Lido</option>
            </select>
          </div>
        </section>

        <section className="books-grid" aria-label="Listagem de livros da coleção" data-revelar-cascata>
          {livrosFiltrados.map((item) => (
            <article key={item.id} className="card-livro" data-revelar>
              <Link to={`/livro/${item.livro}`} style={{ textDecoration: 'none' }}>
                <div className="capa-container">
                  {item.livro_capa ? (
                    <img
                      src={item.livro_capa}
                      alt={`Capa do livro ${item.livro_titulo}`}
                      className="capa-img"
                      loading="lazy"
                      decoding="async"
                      width="300"
                      height="420"
                    />
                  ) : (
                    <i className="fa-solid fa-book" style={{ fontSize: '5rem', color: '#334155' }}></i>
                  )}
                  
                  <span className={`status-badge status-${item.status}`}>
                    {item.status === 'lido' ? 'Lido' : item.status === 'lendo' ? 'Lendo' : 'Quero ler'}
                  </span>
                </div>
              </Link>

              <div className="card-info">
                <h2 className="book-title">
                  {item.favorito && <i className="fa-solid fa-heart" style={{ color: '#ec4899', marginRight: '5px' }} title="Livro Favoritado"></i>}
                  {item.livro_titulo}
                </h2>
                <p className="book-author">Por {item.livro_autor}</p>
                
                <div className="card-actions">
                  <Link to={`/leitura/${item.livro}`} className="btn-ler" title="Abrir leitor digital do livro">
                    <i className="fa-solid fa-book-open-reader"></i> Ler
                  </Link>
                  <button 
                    type="button" 
                    className="btn-remover" 
                    title="Remover da coleção"
                    onClick={() => removerLivro(item.id)}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            </article>
          ))}

          {livrosFiltrados.length === 0 && (
            <div className="empty-state" data-revelar>
              {livros.length === 0 ? (
                <>
                  <span className="empty-icone"><i className="fa-solid fa-book-bookmark"></i></span>
                  <h3>Sua estante ainda está vazia</h3>
                  <p>Explore o acervo, adicione livros e acompanhe seu progresso de leitura por aqui.</p>
                  <Link to="/biblioteca" className="btn-primary">
                    <i className="fa-solid fa-compass"></i> Explorar biblioteca
                  </Link>
                </>
              ) : (
                <>
                  <span className="empty-icone"><i className="fa-solid fa-magnifying-glass"></i></span>
                  <h3>Nenhum livro nesta seleção</h3>
                  <p>Nenhum título corresponde à busca ou ao filtro escolhido.</p>
                </>
              )}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

export default MinhaBiblioteca;
