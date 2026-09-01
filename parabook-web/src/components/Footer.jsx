import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

function Footer() {
  const [rolagem, setRolagem] = useState({ mobile: false, mostrarTopo: false })

  useEffect(() => {
    const consultaMobile = window.matchMedia('(max-width: 768px)')
    let quadro = null
    const atualizar = () => {
      quadro = null
      const alturaRolavel = document.documentElement.scrollHeight - window.innerHeight
      const progresso = alturaRolavel > 0 ? window.scrollY / alturaRolavel : 0
      const proximoEstado = { mobile: consultaMobile.matches, mostrarTopo: progresso >= 0.75 }
      setRolagem((estadoAtual) => (
        estadoAtual.mobile === proximoEstado.mobile && estadoAtual.mostrarTopo === proximoEstado.mostrarTopo
          ? estadoAtual
          : proximoEstado
      ))
    }
    const agendarAtualizacao = () => {
      if (quadro !== null) return
      quadro = window.requestAnimationFrame(atualizar)
    }
    atualizar()
    window.addEventListener('scroll', agendarAtualizacao, { passive: true })
    window.addEventListener('resize', agendarAtualizacao)
    consultaMobile.addEventListener('change', agendarAtualizacao)
    return () => {
      if (quadro !== null) window.cancelAnimationFrame(quadro)
      window.removeEventListener('scroll', agendarAtualizacao)
      window.removeEventListener('resize', agendarAtualizacao)
      consultaMobile.removeEventListener('change', agendarAtualizacao)
    }
  }, [])

  const scrollToTop = () => {
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduzirMovimento ? 'auto' : 'smooth' });
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
          <Link to="/para-autores">Para Autores</Link>
          <Link to="/diretrizes">Diretrizes</Link>
        </div>

        <div className="footer-column">
          <h4>Contato</h4>
          <p className="footer-coming-soon">Canais oficiais em preparação.</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 ParaBook • Todos os direitos reservados</p>
        <button type="button" className={`btn-scroll-top ${rolagem.mostrarTopo ? 'is-mobile-visible' : ''}`} title="Voltar ao topo" aria-label="Voltar ao topo" aria-hidden={rolagem.mobile && !rolagem.mostrarTopo} tabIndex={rolagem.mobile && !rolagem.mostrarTopo ? -1 : undefined} onClick={scrollToTop}>
          <i className="fa-solid fa-arrow-up" aria-hidden="true"></i>
        </button>
      </div>
    </footer>
  )
}

export default Footer
