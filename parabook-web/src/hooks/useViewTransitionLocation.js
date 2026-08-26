import { useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

/**
 * Aplica a View Transitions API nativa do browser à troca de rota do
 * React Router. Sem dependência nova: em browsers sem suporte (Firefox,
 * Safari mais antigo) ou com "reduzir movimento" ativado, a rota troca
 * na hora, sem animação — progressive enhancement puro.
 *
 * Uso: const displayLocation = useViewTransitionLocation(useLocation());
 *      <Routes location={displayLocation}>...</Routes>
 */
export function useViewTransitionLocation(location) {
  const [displayLocation, setDisplayLocation] = useState(location);
  const isFirstRender = useRef(true);

  useLayoutEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (displayLocation.pathname === location.pathname) {
      if (displayLocation.search === location.search && displayLocation.hash === location.hash) return;
      // Mudanças de aba/filtro na query string não trocam a página, mas o
      // contexto de <Routes location> precisa receber a nova location para
      // que useSearchParams reflita o estado atual.
      setDisplayLocation(location);
      return;
    }

    const semSuporte = typeof document.startViewTransition !== 'function';
    const reduzirMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (semSuporte || reduzirMovimento) {
      setDisplayLocation(location);
      return;
    }

    const transicao = document.startViewTransition(() => {
      flushSync(() => setDisplayLocation(location));
    });

    // Navegar de novo antes da anterior terminar (ou trocar de aba no meio)
    // aborta a transição e rejeita estas promises. Sem o catch, o browser
    // registra "InvalidStateError: Transition was aborted" no console —
    // barulho, não falha: a rota já trocou de qualquer jeito.
    transicao.ready.catch(() => {});
    transicao.finished.catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location]);

  return displayLocation;
}
