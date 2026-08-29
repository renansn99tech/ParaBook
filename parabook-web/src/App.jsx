import { lazy, Suspense, useContext, useEffect, useState } from 'react'
import { Routes, Route, useLocation, Navigate, Link } from 'react-router-dom'
import { AuthContext } from './context/auth-context'
import { useViewTransitionLocation } from './hooks/useViewTransitionLocation'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import RouteAccessibility from './components/RouteAccessibility'
import RotaAdmin from './components/admin/RotaAdmin'
import RotaPublicacao from './components/RotaPublicacao'
import api from './services/api'

const Home = lazy(() => import('./pages/Home'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const Profile = lazy(() => import('./pages/Profile'))
const Biblioteca = lazy(() => import('./pages/Biblioteca'))
const Comunidades = lazy(() => import('./pages/Comunidades'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Sobre = lazy(() => import('./pages/Sobre'))
const Backlog = lazy(() => import('./pages/Backlog'))
const Diretrizes = lazy(() => import('./pages/Diretrizes'))
const Autores = lazy(() => import('./pages/Autores'))
const ParaLeitores = lazy(() => import('./pages/ParaLeitores'))
const ParaAutores = lazy(() => import('./pages/ParaAutores'))
const PublicarLivro = lazy(() => import('./pages/PublicarLivro'))
const PainelAutor = lazy(() => import('./pages/PainelAutor'))
const MinhaBiblioteca = lazy(() => import('./pages/MinhaBiblioteca'))
const LivroInfo = lazy(() => import('./pages/LivroInfo'))
const Leitura = lazy(() => import('./pages/Leitura'))
const PerfilPublico = lazy(() => import('./pages/PerfilPublico'))
const Novidades = lazy(() => import('./pages/Novidades'))
const ConteudoComunidade = lazy(() => import('./pages/ConteudoComunidade'))
const PainelDenunciasComunidade = lazy(() => import('./pages/PainelDenunciasComunidade'))
const AlterarSenha = lazy(() => import('./pages/AlterarSenha'))
const ConfiguracoesAvancadas = lazy(() => import('./pages/ConfiguracoesAvancadas'))
const CentralConta = lazy(() => import('./pages/CentralConta'))
const Notificacoes = lazy(() => import('./pages/Notificacoes'))
const Planos = lazy(() => import('./pages/Planos'))
const MinhaAssinatura = lazy(() => import('./pages/MinhaAssinatura'))
const EsqueciSenha = lazy(() => import('./pages/EsqueciSenha'))
const RedefinirSenha = lazy(() => import('./pages/RedefinirSenha'))
const AceitarTermos = lazy(() => import('./pages/AceitarTermos'))
const OnboardingAutor = lazy(() => import('./pages/OnboardingAutor'))
const RecomendacaoIA = lazy(() => import('./pages/RecomendacaoIA'))
const MinhasComunidades = lazy(() => import('./pages/MinhasComunidades'))
const CriarComunidade = lazy(() => import('./pages/CriarComunidade'))
const Ranking = lazy(() => import('./pages/Ranking'))
const MinhasConquistas = lazy(() => import('./pages/MinhasConquistas'))
const AdminDjango = lazy(() => import('./pages/admin/AdminDjango'))
const AdminAuditoria = lazy(() => import('./pages/admin/AdminAuditoria'))
const AdminFeatureFlags = lazy(() => import('./pages/admin/AdminFeatureFlags'))

// Rotas liberadas para quem ainda não aceitou os termos, para não criar loop de redirecionamento.
const ROTAS_ISENTAS_TERMOS = ['/aceitar-termos', '/diretrizes', '/login', '/register', '/esqueci-senha'];

function App() {
  const location = useLocation();
  // Conteúdo da rota é renderizado a partir daqui — navbar/footer/banner
  // continuam presos à location real, para não "piscar" durante a
  // transição (ver hooks/useViewTransitionLocation.js).
  const displayLocation = useViewTransitionLocation(location);
  const { user, loading } = useContext(AuthContext);
  const [flagsPublicas, setFlagsPublicas] = useState({ banner_anuncios: false });
  const isDashboard = location.pathname.startsWith('/dashboard');
  const isAdminAvancado = [
    '/perfil/configuracoes/django-admin',
    '/perfil/configuracoes/auditoria',
    '/perfil/configuracoes/feature-flags',
  ].includes(location.pathname);
  // Telas do fluxo de autenticação: sem navbar/rodapé/banner, já que o usuário não está logado.
  const isAuthPage = ['/login', '/register', '/esqueci-senha'].includes(location.pathname)
    || location.pathname.startsWith('/redefinir-senha/');
  const hideNavAndFooter = isDashboard || isAdminAvancado || isAuthPage;
  const exibirBannerAnuncios = flagsPublicas.banner_anuncios && !hideNavAndFooter;

  useEffect(() => {
    let ativo = true;
    const carregarFlagsPublicas = () => api.get('/dashboard/feature-flags/publicas/')
      .then((resposta) => ativo && setFlagsPublicas(resposta.data))
      .catch(() => ativo && setFlagsPublicas({ banner_anuncios: false }));
    carregarFlagsPublicas();
    window.addEventListener('parabook:feature-flags-atualizadas', carregarFlagsPublicas);
    return () => {
      ativo = false;
      window.removeEventListener('parabook:feature-flags-atualizadas', carregarFlagsPublicas);
    };
  }, []);

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
    // .app-shell é quem pinta o fundo do app (ver base.css): o <body>
    // não reage à troca de tema em tempo de execução, um descendente sim.
    <div className="app-shell">
      <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo principal</a>
      <RouteAccessibility />
      {!hideNavAndFooter && <Navbar />}

      {exibirBannerAnuncios && (
        <div className="container my-3 ad-container">
            <div className="p-3 text-center rounded-3 border border-secondary border-opacity-25 caixa-anuncio">
                <div className="d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <small className="text-white-50"><i className="fa-solid fa-rectangle-ad me-1"></i> Espaço de Anúncio</small>
                    <Link
                        to="/planos"
                        className="btn btn-sm btn-outline-warning interactive rounded-pill px-3 d-inline-flex align-items-center"
                        style={{ minHeight: '44px' }}
                    >
                        Remover anúncios com o Premium ✨
                    </Link>
                </div>
            </div>
        </div>
      )}

      <div id="conteudo-principal" className="route-content" tabIndex="-1">
        <Suspense fallback={<div className="text-center p-5" role="status" aria-live="polite">Carregando página...</div>}>
        <Routes location={displayLocation}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/perfil/alterar-senha" element={<AlterarSenha />} />
          <Route path="/perfil/configuracoes" element={<ConfiguracoesAvancadas />} />
          <Route path="/perfil/configuracoes/django-admin" element={<RotaAdmin><AdminDjango /></RotaAdmin>} />
          <Route path="/perfil/configuracoes/auditoria" element={<RotaAdmin><AdminAuditoria /></RotaAdmin>} />
          <Route path="/perfil/configuracoes/feature-flags" element={<RotaAdmin><AdminFeatureFlags /></RotaAdmin>} />
          <Route path="/perfil/configuracoes/:secao" element={<CentralConta />} />
          <Route path="/perfil/:username" element={<PerfilPublico />} />
          <Route path="/biblioteca" element={<Biblioteca />} />
          <Route path="/comunidades" element={<Comunidades />} />
          <Route path="/comunidade/:id/conteudo" element={<ConteudoComunidade />} />
          <Route path="/comunidade/:id/denuncias" element={<RotaAdmin><PainelDenunciasComunidade /></RotaAdmin>} />
          <Route path="/dashboard" element={<RotaAdmin><Dashboard /></RotaAdmin>} />
          <Route path="/sobre" element={<Sobre />} />
          <Route path="/backlog" element={<Backlog />} />
          <Route path="/diretrizes" element={<Diretrizes />} />
          <Route path="/autores" element={<Autores />} />
          <Route path="/para-leitores" element={<ParaLeitores />} />
          <Route path="/para-autores" element={<ParaAutores />} />
          <Route path="/publicar" element={<RotaPublicacao><PublicarLivro /></RotaPublicacao>} />
          <Route path="/autor/painel" element={<RotaPublicacao><PainelAutor /></RotaPublicacao>} />
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
          <Route path="/comunidades/criar" element={<CriarComunidade />} />

          {/* Gamificação */}
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/minhas-conquistas" element={<MinhasConquistas />} />

          {/* Rotas secundárias que ainda não foram migradas podem exibir uma página temporária ou redirecionar */}
          <Route path="*" element={<main className="text-center mt-5"><h1 className="text-white">Página não encontrada</h1></main>} />
        </Routes>
        </Suspense>
      </div>
      {!hideNavAndFooter && <Footer />}
    </div>
  )
}

export default App
