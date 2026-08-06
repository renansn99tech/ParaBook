import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import logoNova from '../assets/img/logo-nova.png'

function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
    <>
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid navbar-container">
        
        <Link to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="logo-container">
            <img src={logoNova} alt="ParaBook" className="logo-img" />
            <h1 className="logo">
              <span className="para">Para</span><span className="book">Book</span>
            </h1>
          </div>
        </Link>

        <button className="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#parabookNavbar" aria-controls="parabookNavbar" aria-expanded="false" aria-label="Toggle navigation" style={{ filter: 'invert(1)' }}>
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="parabookNavbar">
          <ul className="menu">
            <li><Link to="/biblioteca">Explorar</Link></li>
            <li><Link to="/comunidades">Comunidades</Link></li>
            <li><Link to="/publicar">Publicar Livro</Link></li>
          </ul>

          <div className="nav-actions">
            <button className="search-btn">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>

            {user ? (
              <>
                <Link to="/notificacoes" className="btn-nav btn-outline position-relative" title="Notificações">
                  <i className="fa-solid fa-bell"></i>
                  {user.notificacoes_nao_lidas_count > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.65rem' }}>
                      {user.notificacoes_nao_lidas_count}
                    </span>
                  )}
                </Link>
                <Link to="/perfil" className="btn-nav btn-primary-nav">
                  Meu Perfil
                </Link>
                <button className="btn-nav btn-outline" onClick={logout}>
                  Sair
                </button>
              </>
            ) : (
              <Link to="/login" className="btn-nav btn-outline">
                Entrar
              </Link>
            )}

            {/* Botão do Menu Lateral */}
            <button className="btn-nav btn-outline" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasMenuReact" aria-controls="offcanvasMenuReact">
              <i className="fa-solid fa-bars"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>

    {/* Offcanvas Menu (Menu Lateral) no React */}
    <div className="offcanvas offcanvas-end text-bg-dark" tabIndex="-1" id="offcanvasMenuReact" aria-labelledby="offcanvasMenuLabel" style={{ background: 'linear-gradient(145deg, #0f172a 0%, #1e1b4b 100%)' }}>
      <div className="offcanvas-header border-bottom border-secondary border-opacity-25">
        <h5 className="offcanvas-title" id="offcanvasMenuLabel">Menu Principal</h5>
        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div className="offcanvas-body">
        <ul className="list-unstyled d-flex flex-column gap-3 fs-5 mt-3">
          <li>
            <Link to="/recomendacao-ia" style={{ color: '#f59e0b', fontWeight: '600', textDecoration: 'none' }}>
              <i className="fa-solid fa-wand-magic-sparkles me-2"></i> Recomendação IA
            </Link>
          </li>
          <li>
            <Link to="/autores" className="text-white text-decoration-none">
              <i className="fa-solid fa-pen-nib me-2"></i> Autores
            </Link>
          </li>
          <li>
            <Link to="/sobre" className="text-white text-decoration-none">
              <i className="fa-solid fa-circle-info me-2"></i> Sobre
            </Link>
          </li>
          
          <li><hr className="border-secondary" /></li>
          
          {user ? (
            user.is_superuser ? (
              <li>
                <Link to="/minha-assinatura" className="text-warning text-decoration-none">
                  <i className="fa-solid fa-star me-2"></i> Minha Assinatura
                </Link>
              </li>
            ) : (
              <li>
                <Link to="/planos" className="text-warning text-decoration-none">
                  <i className="fa-solid fa-crown me-2"></i> Assinatura
                </Link>
              </li>
            )
          ) : (
            <li>
              <Link to="/planos" className="text-warning text-decoration-none">
                <i className="fa-solid fa-crown me-2"></i> Assinatura
              </Link>
            </li>
          )}
        </ul>
      </div>
    </div>
    </>
  )
}

export default Navbar
