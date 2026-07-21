import { useContext, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../assets/css/minha-biblioteca.css';

function MinhaBiblioteca() {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

  // Mocks
  const [livros, setLivros] = useState([
    {
      id: 1,
      titulo: "O Senhor dos Anéis",
      autor: "J.R.R. Tolkien",
      categoria: "Ficção",
      status: "lendo", // lido, lendo, quero_ler
      favorito: true,
      capa_url: null
    },
    {
      id: 2,
      titulo: "Duna",
      autor: "Frank Herbert",
      categoria: "Sci-Fi",
      status: "lido",
      favorito: false,
      capa_url: null
    },
    {
      id: 3,
      titulo: "1984",
      autor: "George Orwell",
      categoria: "Ficção",
      status: "quero_ler",
      favorito: true,
      capa_url: null
    }
  ]);

  const [busca, setBusca] = useState('');
  const [filtroGenero, setFiltroGenero] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');

  if (loading) {
    return <div className="text-center mt-5" style={{ color: 'white' }}>Carregando biblioteca...</div>;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  // Filtragem
  const livrosFiltrados = livros.filter(livro => {
    const matchBusca = livro.titulo.toLowerCase().includes(busca.toLowerCase()) || livro.autor.toLowerCase().includes(busca.toLowerCase());
    const matchGenero = filtroGenero ? livro.categoria.toLowerCase() === filtroGenero.toLowerCase() : true;
    const matchStatus = filtroStatus ? livro.status === filtroStatus : true;
    return matchBusca && matchGenero && matchStatus;
  });

  // Estatísticas
  const totalLidos = livros.filter(l => l.status === 'lido').length;
  const lendoAgora = livros.filter(l => l.status === 'lendo').length;

  const removerLivro = (id) => {
    setLivros(livros.filter(l => l.id !== id));
    // Em produção, isso faria um fetch DELETE para a API
  };

  return (
    <main className="minha-biblioteca-page">
      <div className="container-biblioteca">
        
        <header className="banner-biblioteca">
          <div className="banner-content">
            <h1 className="titulo-biblioteca">Minha Biblioteca</h1>
            <p>Organize sua coleção, acompanhe seus status e gerencie seu progresso de leitura em tempo real.</p>
          </div>
        </header>

        <section className="biblioteca-stats" aria-label="Estatísticas de leitura">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><i className="fa-solid fa-book" style={{ color: '#3b82f6' }}></i></div>
              <div className="stat-content">
                <p className="stat-label">Total de Livros</p>
                <p className="stat-value">{livros.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fa-solid fa-circle-check" style={{ color: '#10b981' }}></i></div>
              <div className="stat-content">
                <p className="stat-label">Concluídos</p>
                <p className="stat-value">{totalLidos}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><i className="fa-solid fa-book-open" style={{ color: '#f59e0b' }}></i></div>
              <div className="stat-content">
                <p className="stat-label">Lendo Agora</p>
                <p className="stat-value">{lendoAgora}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="biblioteca-filters" aria-label="Filtros da coleção">
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

        <section className="books-grid" aria-label="Listagem de livros da coleção">
          {livrosFiltrados.map((item) => (
            <article key={item.id} className="card-livro">
              <Link to={`/livro/${item.id}`} style={{ textDecoration: 'none' }}>
                <div className="capa-container">
                  {item.capa_url ? (
                    <img src={item.capa_url} alt={`Capa do livro ${item.titulo}`} className="capa-img" />
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
                  {item.titulo}
                </h2>
                <p className="book-author">Por {item.autor}</p>
                
                <div className="card-actions">
                  <Link to={`/leitura/${item.id}`} className="btn-ler" title="Abrir leitor digital do livro">
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
            <div className="empty-state">
              <i className="fa-solid fa-box-open fs-1 d-block mb-3"></i>
              Nenhum livro encontrado nesta seleção.
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

export default MinhaBiblioteca;
