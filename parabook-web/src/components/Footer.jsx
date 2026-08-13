import { Link } from 'react-router-dom'

function Footer() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-brand">
          <h2>
            <span className="footer-para">Para</span>
            <span className="footer-book">Book</span>
          </h2>
          <p>
            Uma plataforma colaborativa para leitores,
            autores e comunidades literárias.
          </p>
        </div>

        <div className="footer-column">
          <h4>Navegação</h4>
          <Link to="/">Início</Link>
          <Link to="/biblioteca">Biblioteca</Link>
          <Link to="/comunidades">Comunidades</Link>
        </div>

        <div className="footer-column">
          <h4>Autores</h4>
          <Link to="/publicar">Publicar Obra</Link>
          <Link to="/diretrizes">Diretrizes</Link>
        </div>

        <div className="footer-column">
          <h4>Contato</h4>
          <p className="footer-coming-soon">Canais oficiais em preparação.</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 ParaBook • Todos os direitos reservados</p>
        <button type="button" className="btn-scroll-top" title="Voltar ao topo" aria-label="Voltar ao topo" onClick={scrollToTop}>
          <i className="fa-solid fa-arrow-up"></i>
        </button>
      </div>
    </footer>
  )
}

export default Footer
