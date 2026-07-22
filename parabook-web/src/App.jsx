import { Routes, Route, useLocation } from 'react-router-dom'
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

function App() {
  const location = useLocation();
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
  const hideNavAndFooter = isDashboard || isAuthPage;

  return (
    <>
      {!hideNavAndFooter && <Navbar />}
      <div className={hideNavAndFooter ? "" : "container"}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/perfil/:username" element={<PerfilPublico />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/comunidades" element={<Comunidades />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/backlog" element={<Backlog />} />
          <Route path="/diretrizes" element={<Diretrizes />} />
          <Route path="/autores" element={<Autores />} />
          <Route path="/publicar" element={<PublicarLivro />} />
          <Route path="/minha-biblioteca" element={<MinhaBiblioteca />} />
          <Route path="/livro/:id" element={<LivroInfo />} />
          <Route path="/leitura/:id" element={<Leitura />} />
          {/* Rotas secundárias que ainda não foram migradas podem exibir uma página temporária ou redirecionar */}
          <Route path="*" element={<div className="text-center mt-5"><h2 className="text-white">Página em Construção</h2></div>} />
        </Routes>
      </div>
      {!hideNavAndFooter && <Footer />}
    </>
  )
}

export default App
