import { useContext } from 'react'
import { Link } from 'react-router-dom'
import { AuthContext } from '../context/AuthContext'
import logoNova from '../assets/img/logo-nova.png'

function Navbar() {
  const { user, logout } = useContext(AuthContext);

  return (
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
            <li><Link to="/autores">Autores</Link></li>
            <li><Link to="/publicar">Publicar Livro</Link></li>
            <li><Link to="/sobre">Sobre</Link></li>
          </ul>

          <div className="nav-actions">
            <button className="search-btn">
              <i className="fa-solid fa-magnifying-glass"></i>
            </button>

            {user ? (
              <>
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
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
