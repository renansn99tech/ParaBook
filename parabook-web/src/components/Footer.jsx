import { Link } from 'react-router-dom'

function Footer() {
  const scrollToTop = (e) => {
    e.preventDefault();
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
          <a href="#"><i className="fa-brands fa-instagram"></i></a>
          <a href="#"><i className="fa-brands fa-linkedin"></i></a>
          <a href="#"><i className="fa-brands fa-github"></i></a>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 ParaBook • Todos os direitos reservados</p>
        <a href="#" className="btn-scroll-top" title="Voltar ao topo" onClick={scrollToTop}>
          <i className="fa-solid fa-arrow-up"></i>
        </a>
      </div>
    </footer>
  )
}

export default Footer
