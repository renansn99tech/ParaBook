import { Routes, Route, useLocation, Link } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Biblioteca from './pages/Biblioteca'
import Comunidades from './pages/Comunidades'
import Dashboard from './pages/Dashboard'
import Sobre from './pages/Sobre'
import Backlog from './pages/Backlog'
import Diretrizes from './pages/Diretrizes'
import Autores from './pages/Autores'
import PublicarLivro from './pages/PublicarLivro'
import MinhaBiblioteca from './pages/MinhaBiblioteca'
import LivroInfo from './pages/LivroInfo'
import Leitura from './pages/Leitura'
import PerfilPublico from './pages/PerfilPublico'
import Novidades from './pages/Novidades'
import ConteudoComunidade from './pages/ConteudoComunidade'
import AlterarSenha from './pages/AlterarSenha'
import Notificacoes from './pages/Notificacoes'
import Planos from './pages/Planos'
import MinhaAssinatura from './pages/MinhaAssinatura'

function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const hideNavAndFooter = isDashboard || isAuthPage;

  return (
    <>
      {!hideNavAndFooter && <Navbar />}
      
      {/* Banner de anúncio global, igual ao base.html do Django */}
      {!hideNavAndFooter && (
        <div className="container my-3">
            <div className="p-3 text-center rounded-3 border border-secondary border-opacity-25" style={{ background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(8px)' }}>
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <small className="text-white-50"><i className="fa-solid fa-rectangle-ad me-1"></i> Espaço de Anúncio</small>
                    <Link to="/assinatura" className="btn btn-sm btn-outline-warning rounded-pill px-3">
                        Remover anúncios com o Premium ✨
                    </Link>
                </div>
            </div>
        </div>
      )}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/perfil/alterar-senha" element={<AlterarSenha />} />
          <Route path="/perfil/:username" element={<PerfilPublico />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/comunidades" element={<Comunidades />} />
          <Route path="/comunidade/:id/conteudo" element={<ConteudoComunidade />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/backlog" element={<Backlog />} />
          <Route path="/diretrizes" element={<Diretrizes />} />
          <Route path="/autores" element={<Autores />} />
          <Route path="/publicar" element={<PublicarLivro />} />
          <Route path="/minha-biblioteca" element={<MinhaBiblioteca />} />
          <Route path="/livro/:id" element={<LivroInfo />} />
          <Route path="/leitura/:id" element={<Leitura />} />
          <Route path="/biblioteca/novidade" element={<Novidades />} />
          
          {/* Novas Rotas (Notificações e Assinatura) */}
          <Route path="/notificacoes" element={<Notificacoes />} />
          <Route path="/planos" element={<Planos />} />
          <Route path="/minha-assinatura" element={<MinhaAssinatura />} />
          
          {/* Rotas secundárias que ainda não foram migradas podem exibir uma página temporária ou redirecionar */}
          <Route path="*" element={<div className="text-center mt-5"><h2 className="text-white">Página em Construção</h2></div>} />
        </Routes>
      {!hideNavAndFooter && <Footer />}
    </>
  )
}

export default App
