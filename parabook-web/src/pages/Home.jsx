import { lazy, Suspense } from 'react';
import useHomeData from '../hooks/useHomeData';
import useMediaQuery from '../hooks/useMediaQuery';

const HomeDesktop = lazy(() => import('./home/HomeDesktop'));
const HomeMobile = lazy(() => import('./home/HomeMobile'));
const MOBILE_LANDING = '(max-width: 1199.98px)';

function Home() {
  const dados = useHomeData();
  const usarLandingMovel = useMediaQuery(MOBILE_LANDING);
  const Composicao = usarLandingMovel ? HomeMobile : HomeDesktop;

  return (
    <Suspense fallback={<main className="home-loading" role="status" aria-live="polite">Preparando sua página inicial...</main>}>
      <Composicao {...dados} />
    </Suspense>
  );
}

export default Home;
