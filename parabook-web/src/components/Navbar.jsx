import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import useTema from '../hooks/useTema'
import logoNova from '../assets/img/logo-nova.png'

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { alternar, icone, rotulo } = useTema();

  return (
    <>
    <nav className="navbar navbar-expand-lg">
      <div className="container-fluid navbar-container">
        
        <Link to="/" className="logo-link">
          <div className="logo-container">
            <img src={logoNova} alt="ParaBook" className="logo-img" />
            <h1 className="logo">
              <span className="para">Para</span><span className="book">Book</span>
            </h1>
          </div>
        </Link>

        <button className="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#parabookNavbar" aria-controls="parabookNavbar" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse" id="parabookNavbar">
          <ul className="menu">
            <li><Link to="/biblioteca">Explorar</Link></li>
            <li><Link to="/comunidades">Comunidades</Link></li>
            <li><Link to="/publicar">Publicar Livro</Link></li>
          </ul>

          <div className="nav-actions">
            {/* O title e o aria-label dizem o que o clique VAI fazer, não o
                que está ativo. Sem aria-pressed: com três temas em rodízio
                isto deixou de ser um botão de dois estados, e "pressionado"
                não descreveria mais nada. */}
            <button
              className="btn-nav btn-outline btn-nav-icone"
              onClick={alternar}
              title={rotulo}
              aria-label={rotulo}
            >
              <i className={`fa-solid ${icone}`}></i>
            </button>

            {user ? (
              <>
                <Link to="/notificacoes" className="btn-nav btn-outline btn-nav-icone position-relative" title="Notificações">
                  <i className="fa-solid fa-bell"></i>
                  {user.notificacoes_nao_lidas_count > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger badge-contador">
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
    <div className="offcanvas offcanvas-end" tabIndex="-1" id="offcanvasMenuReact" aria-labelledby="offcanvasMenuLabel">
      <div className="offcanvas-header border-bottom border-secondary border-opacity-25">
        <h5 className="offcanvas-title" id="offcanvasMenuLabel">Menu Principal</h5>
        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Close"></button>
      </div>
      <div className="offcanvas-body">
        <ul className="list-unstyled d-flex flex-column gap-3 fs-5 mt-3">
          <li>
            <Link to="/recomendacao-ia" className="link-ia">
              <i className="fa-solid fa-compass me-2"></i> Recomendações para você
            </Link>
          </li>
          <li>
            <Link to="/autores" className="text-white text-decoration-none">
              <i className="fa-solid fa-pen-nib me-2"></i> Autores
            </Link>
          </li>
          {user && (
            <li>
              <Link to="/minhas-comunidades" className="text-white text-decoration-none">
                <i className="fa-solid fa-users-rectangle me-2"></i> Minhas Comunidades
              </Link>
            </li>
          )}
          {user && (
            <>
              <li>
                <Link to="/ranking" className="text-white text-decoration-none">
                  <i className="fa-solid fa-trophy me-2"></i> Ranking de Leitores
                </Link>
              </li>
              <li>
                <Link to="/minhas-conquistas" className="text-white text-decoration-none">
                  <i className="fa-solid fa-award me-2"></i> Minhas Conquistas
                </Link>
              </li>
            </>
          )}
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
