import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/auth-context';
import Skeleton from '../components/Skeleton';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/biblioteca.css';

const TOTAL_SKELETONS = 8;

function Biblioteca() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  
  const [livros, setLivros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const paginaRef = useRevelacao([livros, categorias, loading]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [livrosRes, categoriasRes] = await Promise.all([
          api.get('/biblioteca/livros/'),
          api.get('/biblioteca/categorias/')
        ]);

        const livrosData = livrosRes.data.results || livrosRes.data;
        const categoriasData = categoriasRes.data.results || categoriasRes.data;

        setLivros(livrosData);
        setCategorias(categoriasData);
      } catch (error) {
        console.error("Erro ao buscar dados da biblioteca:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAddBiblioteca = async (livroId) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    try {
      await api.post('/biblioteca/estante/', { livro: livroId, status: 'quero_ler' });
      // Redireciona para Minha Biblioteca ou mostra sucesso (Swal)
      navigate('/minha-biblioteca');
    } catch (error) {
      console.error("Erro ao adicionar à biblioteca", error);
    }
  };

  // Helper para renderizar os cards de livros
  const renderLivros = (livrosDaCategoria, nomeGenero) => {
    if (livrosDaCategoria.length === 0) {
      return (
        <div className="col-12" data-revelar>
          <p className="text-muted fst-italic">
            <i className="fa-solid fa-circle-info me-2"></i>Nenhum livro de {nomeGenero.toLowerCase()} encontrado.
          </p>
        </div>
      );
    }

    return livrosDaCategoria.map(livro => {
      const fallbackImage = 'https://via.placeholder.com/150x200?text=Sem+Capa';
      return (
        <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={livro.id} data-revelar>
          <article className="card h-100 card-livro-publico" style={{ position: 'relative' }}>
            <Link to={`/livro/${livro.id}`} className="btn-info-livro" title="Ver Informações" style={{ zIndex: 20 }}>
              <i className="fa-solid fa-info"></i>
            </Link>
            <div className="container-capa">
              <img src={livro.capa_url || fallbackImage} alt={`Capa do livro ${livro.titulo}`} className="img-capa-ajustada" />
            </div>
            <div className="card-body d-flex flex-column p-3">
              <h5 className="card-title text-truncate mb-1 fw-bold" title={livro.titulo}>
                {livro.titulo}
              </h5>
              <p className="card-text small text-muted mb-2">Por: {livro.autor || 'Desconhecido'}</p>
              <p className="card-text small mb-3">
                <span className="badge bg-secondary">{livro.categoria_nome || 'Geral'}</span>
              </p>
              
              {livro.pdf ? (
                <Link to={`/leitura/${livro.id}`} className="btn btn-outline-success btn-sm w-100 mt-auto py-2 fw-medium d-flex align-items-center justify-content-center gap-2" style={{ textDecoration: 'none' }}>
                  <i className="fa-solid fa-book-open"></i> Ler Obra
                </Link>
              ) : (
                <button 
                  onClick={() => handleAddBiblioteca(livro.id)}
                  className="btn btn-primary btn-sm w-100 mt-auto d-flex align-items-center justify-content-center gap-1 py-2 fw-medium"
                >
                  <i className="fa-solid fa-plus small"></i> Adicionar à biblioteca
                </button>
              )}
            </div>
          </article>
        </div>
      );
    });
  };

  if (loading) {
    return (
      <div className="container py-4" id="topo">
        <header className="banner-biblioteca-publica p-5 mb-5 text-center text-md-start">
          <div className="row align-items-center">
            <div className="col-12 col-md-8">
              <h1 className="display-5 fw-bold mb-3">Todos os Títulos</h1>
              <p className="lead mb-2">Aqui você encontrará uma ampla seleção de livros, desde os clássicos aos atuais.</p>
              <p className="mb-0 opacity-75">Explore nosso acervo e descubra novos títulos em diferentes categorias.</p>
            </div>
          </div>
        </header>
        <div className="row g-4">
          {Array.from({ length: TOTAL_SKELETONS }).map((_, i) => (
            <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={i}>
              <article className="card h-100 card-livro-publico">
                <div className="container-capa">
                  <Skeleton variant="thumb" width="100%" height="100%" />
                </div>
                <div className="card-body d-flex flex-column p-3 gap-2">
                  <Skeleton variant="title" />
                  <Skeleton variant="text" width="45%" />
                  <Skeleton variant="text" width="100%" height="34px" style={{ marginTop: 'auto' }} />
                </div>
              </article>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Agrupar livros por categoria baseando-se nas categorias da API
  const sessoesPorCategoria = categorias.map(cat => {
    const livrosDaCat = livros.filter(l => l.categoria === cat.id);
    let icon = "fa-book";
    
    // Associar um ícone baseado no nome (apenas estética extra, fallback fa-book)
    const nomeLower = cat.nome.toLowerCase();
    if (nomeLower.includes('filosofia')) icon = "fa-brain";
    else if (nomeLower.includes('literatura')) icon = "fa-book-open";
    else if (nomeLower.includes('religios')) icon = "fa-dove";
    else if (nomeLower.includes('exata')) icon = "fa-calculator";
    else if (nomeLower.includes('infanti')) icon = "fa-child-reaching";

    return (
      <section className="secao-genero" key={cat.id}>
        <h2 className="titulo-genero-linha" data-revelar><i className={`fa-solid ${icon} me-2 text-primary`}></i>{cat.nome}</h2>
        <div className="row g-4" data-revelar-cascata>{renderLivros(livrosDaCat, cat.nome)}</div>
      </section>
    );
  });

  const obrasIndependentes = livros.filter(l => !l.categoria); // Livros sem categoria definida (se houver)

  return (
    <div className="container py-4" id="topo" ref={paginaRef}>
      <header className="banner-biblioteca-publica p-5 mb-5 text-center text-md-start" data-revelar>
        <div className="row align-items-center">
          <div className="col-12 col-md-8">
            <h1 className="display-5 fw-bold mb-3">Todos os Títulos</h1>
            <p className="lead mb-2">Aqui você encontrará uma ampla seleção de livros, desde os clássicos aos atuais.</p>
            <p className="mb-0 opacity-75">Explore nosso acervo e descubra novos títulos em diferentes categorias.</p>
          </div>
          <div className="col-12 col-md-4 text-center text-md-end mt-4 mt-md-0">
            {user && (
              /* Era `btn btn-light`: um botão branco do Bootstrap sobre o
                 banner roxo escuro. .btn-ghost é a ação secundária do
                 design system e já traz hover, foco e press prontos. */
              <Link to="/minha-biblioteca" className="btn-ghost">
                <i className="fa-solid fa-bookmark me-2 text-primary"></i>Minha Estante
              </Link>
            )}
          </div>
        </div>
      </header>

      {livros.length === 0 ? (
        <div className="biblioteca-vazia" data-revelar>
          <span className="empty-icone"><i className="fa-solid fa-book-open"></i></span>
          <h2>O acervo está sendo preparado</h2>
          <p>Ainda não há títulos publicados. Assim que novas obras chegarem, elas aparecerão aqui organizadas por categoria.</p>
          {user ? (
            <Link to="/publicar" className="btn-primary">
              <i className="fa-solid fa-feather-pointed"></i> Publicar uma obra
            </Link>
          ) : (
            <Link to="/comunidades" className="btn-ghost">
              <i className="fa-solid fa-users"></i> Explorar comunidades
            </Link>
          )}
        </div>
      ) : (
        <>
          {sessoesPorCategoria}

          {obrasIndependentes.length > 0 && (
            <section className="secao-genero" id="secao-independentes">
              <h2 className="titulo-genero-linha" data-revelar><i className="fa-solid fa-pen-nib me-2 text-primary"></i>Outros / Independentes</h2>
              <div className="row g-4" data-revelar-cascata>{renderLivros(obrasIndependentes, 'obra independente')}</div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default Biblioteca;
