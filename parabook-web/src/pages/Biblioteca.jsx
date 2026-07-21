import { Link } from 'react-router-dom';
import '../assets/css/biblioteca.css';

function Biblioteca() {
  // Mock Dados
  const livrosFilosofia = [
    { id: 1, titulo: "A República", autor: "Platão", categoria: { nome: "Filosofia" } }
  ];
  const livrosLiteratura = [
    { id: 2, titulo: "Dom Casmurro", autor: "Machado de Assis", categoria: { nome: "Literatura" } },
    { id: 3, titulo: "1984", autor: "George Orwell", categoria: { nome: "Literatura" } }
  ];
  const livrosReligiosos = [];
  const livrosExatas = [
    { id: 4, titulo: "Física Básica", autor: "H. Moysés", categoria: { nome: "Ciências Exatas" } }
  ];
  const livrosInfantis = [];
  const obrasIndependentes = [
    { id: 5, titulo: "O Despertar", autor: "Autor Desconhecido", arquivo: true }
  ];

  // Helper para renderizar os cards de livros
  const renderLivros = (livros, nomeGenero) => {
    if (livros.length === 0) {
      return (
        <div className="col-12">
          <p className="text-muted fst-italic">
            <i className="fa-solid fa-circle-info me-2"></i>Nenhum livro de {nomeGenero.toLowerCase()} encontrado.
          </p>
        </div>
      );
    }

    return livros.map(livro => (
      <div className="col-12 col-sm-6 col-md-4 col-lg-3" key={livro.id}>
        <article className="card h-100 card-livro-publico" style={{ position: 'relative' }}>
          <Link to={`/livro/${livro.id}`} className="btn-info-livro" title="Ver Informações" style={{ zIndex: 20 }}>
            <i className="fa-solid fa-info"></i>
          </Link>
          <div className="container-capa">
            <img src={livro.capa_url || 'https://via.placeholder.com/150x200?text=Sem+Capa'} alt={`Capa do livro ${livro.titulo}`} className="img-capa-ajustada" />
          </div>
          <div className="card-body d-flex flex-column p-3">
            <h5 className="card-title text-truncate mb-1 fw-bold" title={livro.titulo}>
              {livro.titulo}
            </h5>
            <p className="card-text small text-muted mb-2">Por: {livro.autor}</p>
            <p className="card-text small mb-3">
              <span className="badge bg-secondary">{livro.categoria?.nome || 'Geral'}</span>
            </p>
            
            {livro.arquivo ? (
              <button className="btn btn-outline-success btn-sm w-100 mt-auto py-2 fw-medium d-flex align-items-center justify-content-center gap-2">
                <i className="fa-solid fa-book-open"></i> Ler Obra
              </button>
            ) : (
              <button className="btn btn-primary btn-sm w-100 mt-auto d-flex align-items-center justify-content-center gap-1 py-2 fw-medium">
                <i className="fa-solid fa-plus small"></i> Adicionar à biblioteca
              </button>
            )}
          </div>
        </article>
      </div>
    ));
  };

  return (
    <div className="container py-4" id="topo">
      <header className="banner-biblioteca-publica p-5 mb-5 text-center text-md-start">
        <div className="row align-items-center">
          <div className="col-12 col-md-8">
            <h1 className="display-5 fw-bold mb-3">Todos os Títulos</h1>
            <p className="lead mb-2">Aqui você encontrará uma ampla seleção de livros, desde os clássicos aos atuais.</p>
            <p className="mb-0 opacity-75">Explore nosso acervo e descubra novos títulos em diferentes categorias.</p>
          </div>
          <div className="col-12 col-md-4 text-center text-md-end mt-4 mt-md-0">
            <Link to="/minha-biblioteca" className="btn btn-light btn-lg fw-semibold shadow-sm">
              <i className="fa-solid fa-bookmark me-2 text-primary"></i>Minha Estante
            </Link>
          </div>
        </div>
      </header>

      <section className="secao-genero">
        <h2 className="titulo-genero-linha"><i className="fa-solid fa-brain me-2 text-primary"></i>Filosofia</h2>
        <div className="row g-4">{renderLivros(livrosFilosofia, 'filosofia')}</div>
      </section>

      <section className="secao-genero">
        <h2 className="titulo-genero-linha"><i className="fa-solid fa-book-open me-2 text-primary"></i>Literatura</h2>
        <div className="row g-4">{renderLivros(livrosLiteratura, 'literatura')}</div>
      </section>

      <section className="secao-genero">
        <h2 className="titulo-genero-linha"><i className="fa-solid fa-dove me-2 text-primary"></i>Religiosos</h2>
        <div className="row g-4">{renderLivros(livrosReligiosos, 'religioso')}</div>
      </section>

      <section className="secao-genero">
        <h2 className="titulo-genero-linha"><i className="fa-solid fa-calculator me-2 text-primary"></i>Ciências Exatas</h2>
        <div className="row g-4">{renderLivros(livrosExatas, 'exatas')}</div>
      </section>

      <section className="secao-genero">
        <h2 className="titulo-genero-linha"><i className="fa-solid fa-child-reaching me-2 text-primary"></i>Infantis</h2>
        <div className="row g-4">{renderLivros(livrosInfantis, 'infantil')}</div>
      </section>

      <section className="secao-genero" id="secao-independentes">
        <h2 className="titulo-genero-linha"><i className="fa-solid fa-pen-nib me-2 text-primary"></i>Autores Independentes</h2>
        <div className="row g-4">{renderLivros(obrasIndependentes, 'obra independente')}</div>
      </section>
    </div>
  );
}

export default Biblioteca;
