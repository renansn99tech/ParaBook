import { useContext } from 'react'
import { Routes, Route, useLocation, Link, Navigate } from 'react-router-dom'
import { AuthContext } from './context/AuthContext'
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
import EsqueciSenha from './pages/EsqueciSenha'
import RedefinirSenha from './pages/RedefinirSenha'
import AceitarTermos from './pages/AceitarTermos'
import OnboardingAutor from './pages/OnboardingAutor'
import RecomendacaoIA from './pages/RecomendacaoIA'
import MinhasComunidades from './pages/MinhasComunidades'

// Rotas liberadas para quem ainda não aceitou os termos, para não criar loop de redirecionamento.
const ROTAS_ISENTAS_TERMOS = ['/aceitar-termos', '/diretrizes', '/login', '/register', '/esqueci-senha'];

function App() {
  const location = useLocation();
  const { user, loading } = useContext(AuthContext);
  const isDashboard = location.pathname.startsWith('/dashboard');
  // Telas do fluxo de autenticação: sem navbar/rodapé/banner, já que o usuário não está logado.
  const isAuthPage = ['/login', '/register', '/esqueci-senha'].includes(location.pathname)
    || location.pathname.startsWith('/redefinir-senha/');
  const hideNavAndFooter = isDashboard || isAuthPage;

  // Equivalente ao ForcarAceiteTermosMiddleware do lado dos templates legados:
  // trava a navegação de quem tem pendência de aceite dos termos.
  const precisaAceitarTermos = !loading
    && user
    && user.termos_aceitos === false
    && !ROTAS_ISENTAS_TERMOS.includes(location.pathname)
    && !location.pathname.startsWith('/redefinir-senha/');

  if (precisaAceitarTermos) {
    return <Navigate to="/aceitar-termos" replace />;
  }

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

          {/* Recuperação de senha (fluxo público, fora do login) */}
          <Route path="/esqueci-senha" element={<EsqueciSenha />} />
          <Route path="/redefinir-senha/:uid/:token" element={<RedefinirSenha />} />

          {/* Compliance, onboarding e recursos de leitura */}
          <Route path="/aceitar-termos" element={<AceitarTermos />} />
          <Route path="/autor/onboarding" element={<OnboardingAutor />} />
          <Route path="/recomendacao-ia" element={<RecomendacaoIA />} />
          <Route path="/minhas-comunidades" element={<MinhasComunidades />} />
          
          {/* Rotas secundárias que ainda não foram migradas podem exibir uma página temporária ou redirecionar */}
          <Route path="*" element={<div className="text-center mt-5"><h2 className="text-white">Página em Construção</h2></div>} />
        </Routes>
      {!hideNavAndFooter && <Footer />}
    </>
  )
}

export default App
