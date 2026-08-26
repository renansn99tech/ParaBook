import { useContext, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthContext } from '../context/auth-context'
import useTema from '../hooks/useTema'
import { obterAvatarPerfil } from '../services/avatarPerfil'
import { obterCtaAutoria } from '../services/ctaAutoria'
import logoNova from '../assets/img/logo-nova-160.webp'
import logoNova2x from '../assets/img/logo-nova-320.webp'

function Navbar() {
  const { user, logout } = useContext(AuthContext)
  const avatarUsuario = obterAvatarPerfil(user)
  const ctaPublicacao = user
    ? obterCtaAutoria(user)
    : { to: '/para-autores', label: 'Conhecer autoria' }
  const { alternar, icone, rotulo } = useTema()
  const navigate = useNavigate()
  const [contaAberta, setContaAberta] = useState(false)
  const cliqueContaRef = useRef(null)
  const botaoContaRef = useRef(null)
  const fecharContaRef = useRef(null)

  useEffect(() => () => window.clearTimeout(cliqueContaRef.current), [])

  useEffect(() => {
    if (!contaAberta) return undefined
    fecharContaRef.current?.focus()
    const fecharComEscape = (evento) => {
      if (evento.key === 'Escape') {
        setContaAberta(false)
        botaoContaRef.current?.focus()
      }
    }
    document.addEventListener('keydown', fecharComEscape)
    return () => document.removeEventListener('keydown', fecharComEscape)
  }, [contaAberta])

  const fecharMenu = () => {
    const elemento = document.getElementById('offcanvasMenuReact')
    const instancia = elemento ? window.bootstrap?.Offcanvas.getInstance(elemento) : null
    instancia?.hide()
  }

  const abrirConta = () => {
    window.clearTimeout(cliqueContaRef.current)
    cliqueContaRef.current = window.setTimeout(() => setContaAberta(true), 220)
  }

  const abrirPerfilDireto = () => {
    window.clearTimeout(cliqueContaRef.current)
    setContaAberta(false)
    navigate('/perfil')
  }

  const sairPelaConta = () => {
    setContaAberta(false)
    logout()
  }

  return (
    <>
      <nav className="navbar" aria-label="Navegação principal">
        <div className="navbar-container">
          <Link to="/" className="logo-link" aria-label="ParaBook — página inicial">
            <span className="logo-container">
              <img src={logoNova} srcSet={`${logoNova} 1x, ${logoNova2x} 2x`} alt="" aria-hidden="true" className="logo-img" width="160" height="107" decoding="async" />
              <span className="logo" aria-hidden="true"><span className="para">Para</span><span className="book">Book</span></span>
            </span>
          </Link>

          <ul className="menu navbar-menu-centro">
            <li><Link to="/biblioteca">Explorar</Link></li>
            <li><Link to="/comunidades">Comunidades</Link></li>
            <li><Link to="/autores">Autores</Link></li>
            {user?.tipo === 'autor' && <li><Link to="/publicar" className="navbar-publicar-livro"><i className="fa-solid fa-feather-pointed" aria-hidden="true"></i> Publicar Livro</Link></li>}
          </ul>

          <div className="nav-actions">
            {user && <Link to="/notificacoes" className="btn-nav btn-outline btn-nav-icone nav-notificacoes position-relative" title="Notificações" aria-label="Notificações"><i className="fa-solid fa-bell" aria-hidden="true"></i>{user.notificacoes_nao_lidas_count > 0 && <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger badge-contador">{user.notificacoes_nao_lidas_count}</span>}</Link>}
            <button className="btn-nav btn-outline btn-nav-icone" onClick={alternar} title={rotulo} aria-label={rotulo}><i className={`fa-solid ${icone}`} aria-hidden="true"></i></button>
            {user ? (
              <button ref={botaoContaRef} type="button" className="nav-perfil-circular" onClick={abrirConta} onDoubleClick={abrirPerfilDireto} aria-expanded={contaAberta} aria-controls="drawerContaReact" aria-label="Abrir menu da conta; clique duas vezes para ir ao perfil" title="Conta — duplo clique abre o perfil"><img src={avatarUsuario} alt="" aria-hidden="true" width="48" height="48" /><span className="nav-perfil-status" aria-hidden="true"></span></button>
            ) : <Link to="/login" className="btn-nav btn-outline nav-entrar">Entrar</Link>}
          </div>
        </div>
      </nav>

      {user && <>
        <div className={`nav-account-backdrop ${contaAberta ? 'is-open' : ''}`} onClick={() => setContaAberta(false)} aria-hidden="true"></div>
        <aside id="drawerContaReact" className={`nav-account-drawer ${contaAberta ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-hidden={!contaAberta} inert={!contaAberta} aria-labelledby="drawerContaTitulo">
          <header className="nav-account-header">
            <img src={avatarUsuario} alt="" aria-hidden="true" width="52" height="52" />
            <span><small>Sua conta</small><strong id="drawerContaTitulo">{user.nome || user.username || 'Leitor ParaBook'}</strong></span>
            <button ref={fecharContaRef} type="button" onClick={() => { setContaAberta(false); botaoContaRef.current?.focus() }} aria-label="Fechar menu da conta"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </header>
          <nav className="nav-account-links" aria-label="Opções da conta">
            <Link to="/perfil" onClick={() => setContaAberta(false)}><i className="fa-solid fa-circle-user" aria-hidden="true"></i><span><strong>Perfil</strong><small>Veja sua jornada literária</small></span><i className="fa-solid fa-chevron-right" aria-hidden="true"></i></Link>
            <Link to="/minha-assinatura" onClick={() => setContaAberta(false)}><i className="fa-solid fa-crown" aria-hidden="true"></i><span><strong>Minha Assinatura</strong><small>Plano e benefícios</small></span><i className="fa-solid fa-chevron-right" aria-hidden="true"></i></Link>
            <Link to="/ranking" onClick={() => setContaAberta(false)}><i className="fa-solid fa-ranking-star" aria-hidden="true"></i><span><strong>Ranking</strong><small>Confira sua posição</small></span><i className="fa-solid fa-chevron-right" aria-hidden="true"></i></Link>
            <button type="button" className="nav-account-sair" onClick={sairPelaConta}><i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i><span><strong>Sair</strong><small>Encerrar esta sessão</small></span></button>
          </nav>
        </aside>
      </>}

      <div className="edge-menu-zone"><button className="edge-menu-trigger" type="button" data-bs-toggle="offcanvas" data-bs-target="#offcanvasMenuReact" aria-controls="offcanvasMenuReact" aria-label="Abrir menu completo" title="Abrir menu completo"><i className="fa-solid fa-bars" aria-hidden="true"></i></button></div>

      <div className="offcanvas offcanvas-end" tabIndex="-1" id="offcanvasMenuReact" aria-labelledby="offcanvasMenuLabel">
        <div className="offcanvas-header border-bottom border-secondary border-opacity-25"><h5 className="offcanvas-title" id="offcanvasMenuLabel">Menu Principal</h5><button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas" aria-label="Fechar menu"></button></div>
        <div className="offcanvas-body">
          <div className="offcanvas-section offcanvas-section-primary offcanvas-mobile-only" aria-label="Destinos principais">
            <Link to="/biblioteca" onClick={fecharMenu}><i className="fa-solid fa-book-open" aria-hidden="true"></i><span>Explorar livros</span></Link>
            <Link to="/comunidades" onClick={fecharMenu}><i className="fa-solid fa-people-group" aria-hidden="true"></i><span>Comunidades</span></Link>
            <Link to="/autores" onClick={fecharMenu}><i className="fa-solid fa-pen-nib" aria-hidden="true"></i><span>Autores</span></Link>
            {user?.tipo === 'autor' && <Link to="/autor/painel" onClick={fecharMenu}><i className="fa-solid fa-chart-line" aria-hidden="true"></i><span>Painel do Autor</span></Link>}
          </div>

          <div className="offcanvas-section offcanvas-section-publicar" aria-label="Publicação"><p className="offcanvas-kicker">Criar</p><Link to={ctaPublicacao.to} className="link-publicar" onClick={fecharMenu}><i className="fa-solid fa-feather-pointed" aria-hidden="true"></i><span>{ctaPublicacao.label}</span></Link></div>
          <div className="offcanvas-divider" role="separator"></div>

          <div className="offcanvas-section" aria-label="Mais opções">
            <p className="offcanvas-kicker">Descobrir</p>
            <Link to="/recomendacao-ia" className="link-ia" onClick={fecharMenu}><i className="fa-solid fa-compass" aria-hidden="true"></i><span>Recomendações para você</span></Link>
            {user && <Link to="/minhas-comunidades" onClick={fecharMenu}><i className="fa-solid fa-users-rectangle" aria-hidden="true"></i><span>Minhas comunidades</span></Link>}
            {user && <Link to="/minhas-conquistas" onClick={fecharMenu}><i className="fa-solid fa-award" aria-hidden="true"></i><span>Minhas conquistas</span></Link>}
            {user?.is_superuser && <Link to="/dashboard" onClick={fecharMenu}><i className="fa-solid fa-gauge-high" aria-hidden="true"></i><span>Painel administrativo</span></Link>}
          </div>

          <div className="offcanvas-divider" role="separator"></div>
          <div className="offcanvas-section offcanvas-section-conhecer" aria-label="Conhecer o ParaBook">
            <p className="offcanvas-kicker">Conhecer</p>
            <Link to="/sobre" onClick={fecharMenu}><i className="fa-solid fa-circle-info" aria-hidden="true"></i><span>Sobre o ParaBook</span></Link>
            <Link to="/backlog" onClick={fecharMenu}><i className="fa-solid fa-code-branch" aria-hidden="true"></i><span>Backlog/Changelog</span></Link>
          </div>

          {!user && <><div className="offcanvas-divider" role="separator"></div><div className="offcanvas-section"><Link to="/planos" className="offcanvas-subscription" onClick={fecharMenu}><i className="fa-solid fa-crown" aria-hidden="true"></i><span>Conhecer assinatura</span></Link></div></>}
        </div>
      </div>
    </>
  )
}

export default Navbar
