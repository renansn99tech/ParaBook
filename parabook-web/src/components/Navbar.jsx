import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import useTema from '../hooks/useTema'
import logoNova from '../assets/img/logo-nova-160.webp'
import logoNova2x from '../assets/img/logo-nova-320.webp'

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const { alternar, icone, rotulo } = useTema();

  const fecharMenu = () => {
    const elemento = document.getElementById('offcanvasMenuReact');
    const instancia = elemento ? window.bootstrap?.Offcanvas.getInstance(elemento) : null;
    instancia?.hide();
  };

  const sairPeloMenu = () => {
    fecharMenu();
    logout();
  };

  return (
    <>
    <nav className="navbar" aria-label="Navegação principal">
      <div className="container-fluid navbar-container">
        
        <Link to="/" className="logo-link">
          <div className="logo-container">
            <img
              src={logoNova}
              srcSet={`${logoNova} 1x, ${logoNova2x} 2x`}
              alt="ParaBook"
              className="logo-img"
              width="160"
              height="107"
              decoding="async"
            />
            <h1 className="logo">
              <span className="para">Para</span><span className="book">Book</span>
            </h1>
          </div>
        </Link>

        <button
          className="navbar-toggler navbar-mobile-trigger border-0 shadow-none"
          type="button"
          data-bs-toggle="offcanvas"
          data-bs-target="#offcanvasMenuReact"
          aria-controls="offcanvasMenuReact"
          aria-label="Abrir menu principal"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="navbar-collapse">
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
            <button
              className="btn-nav btn-outline btn-nav-icone"
              type="button"
              data-bs-toggle="offcanvas"
              data-bs-target="#offcanvasMenuReact"
              aria-controls="offcanvasMenuReact"
              aria-label="Abrir menu completo"
              title="Abrir menu completo"
            >
              <i className="fa-solid fa-bars"></i>
            </button>
          </div>
        </div>
      </div>
    </nav>

    {/* Menu único no mobile e menu complementar no desktop. */}
    <div className="offcanvas offcanvas-end" tabIndex="-1" id="offcanvasMenuReact" aria-labelledby="offcanvasMenuLabel">
      <div className="offcanvas-header border-bottom border-secondary border-opacity-25">
        <h5 className="offcanvas-title" id="offcanvasMenuLabel">Menu Principal</h5>
        <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Fechar menu"></button>
      </div>
      <div className="offcanvas-body">
        <div className="offcanvas-section offcanvas-section-primary offcanvas-mobile-only" aria-label="Destinos principais">
          <Link to="/biblioteca" onClick={fecharMenu}>
            <i className="fa-solid fa-book-open"></i>
            <span>Explorar livros</span>
          </Link>
          <Link to="/comunidades" onClick={fecharMenu}>
            <i className="fa-solid fa-people-group"></i>
            <span>Comunidades</span>
          </Link>
          <Link to="/publicar" onClick={fecharMenu}>
            <i className="fa-solid fa-feather"></i>
            <span>Publicar livro</span>
          </Link>
        </div>

        <div className="offcanvas-divider offcanvas-mobile-only" role="separator"></div>

        <div className="offcanvas-section offcanvas-mobile-only" aria-label="Conta e preferências">
          <p className="offcanvas-kicker">Conta e preferências</p>
          <button type="button" className="offcanvas-action" onClick={alternar}>
            <i className={`fa-solid ${icone}`}></i>
            <span>{rotulo}</span>
          </button>

          {user ? (
            <>
              <Link to="/notificacoes" onClick={fecharMenu}>
                <i className="fa-solid fa-bell"></i>
                <span>Notificações</span>
                {user.notificacoes_nao_lidas_count > 0 && (
                  <span className="offcanvas-badge">{user.notificacoes_nao_lidas_count}</span>
                )}
              </Link>
              <Link to="/perfil" onClick={fecharMenu}>
                <i className="fa-solid fa-circle-user"></i>
                <span>Meu perfil</span>
              </Link>
              <button type="button" className="offcanvas-action" onClick={sairPeloMenu}>
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                <span>Sair</span>
              </button>
            </>
          ) : (
            <Link to="/login" onClick={fecharMenu}>
              <i className="fa-solid fa-right-to-bracket"></i>
              <span>Entrar</span>
            </Link>
          )}
        </div>

        <div className="offcanvas-divider offcanvas-mobile-only" role="separator"></div>

        <div className="offcanvas-section" aria-label="Mais opções">
          <p className="offcanvas-kicker">Descobrir</p>
          <Link to="/recomendacao-ia" className="link-ia" onClick={fecharMenu}>
            <i className="fa-solid fa-compass"></i>
            <span>Recomendações para você</span>
          </Link>
          <Link to="/autores" onClick={fecharMenu}>
            <i className="fa-solid fa-pen-nib"></i>
            <span>Autores</span>
          </Link>
          {user && (
            <Link to="/minhas-comunidades" onClick={fecharMenu}>
              <i className="fa-solid fa-users-rectangle"></i>
              <span>Minhas comunidades</span>
            </Link>
          )}
          {user && (
            <>
              <Link to="/ranking" onClick={fecharMenu}>
                <i className="fa-solid fa-trophy"></i>
                <span>Ranking de leitores</span>
              </Link>
              <Link to="/minhas-conquistas" onClick={fecharMenu}>
                <i className="fa-solid fa-award"></i>
                <span>Minhas conquistas</span>
              </Link>
            </>
          )}
          {user?.is_superuser && (
            <Link to="/dashboard" onClick={fecharMenu}>
              <i className="fa-solid fa-gauge-high"></i>
              <span>Painel administrativo</span>
            </Link>
          )}
          <Link to="/sobre" onClick={fecharMenu}>
            <i className="fa-solid fa-circle-info"></i>
            <span>Sobre o ParaBook</span>
          </Link>
        </div>

        <div className="offcanvas-divider" role="separator"></div>

        <div className="offcanvas-section">
          {user ? (
            <Link to="/minha-assinatura" className="offcanvas-subscription" onClick={fecharMenu}>
              <i className="fa-solid fa-star"></i>
              <span>Minha assinatura</span>
            </Link>
          ) : (
            <Link to="/planos" className="offcanvas-subscription" onClick={fecharMenu}>
              <i className="fa-solid fa-crown"></i>
              <span>Conhecer assinatura</span>
            </Link>
          )}
        </div>
      </div>
    </div>
    </>
  )
}

export default Navbar
