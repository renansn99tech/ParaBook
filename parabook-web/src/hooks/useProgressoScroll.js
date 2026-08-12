import { useEffect, useRef } from 'react';

/**
 * Traduz "quanto desta seção já passou pela tela" em um número de 0 a 1,
 * publicado como a custom property `--progresso` no próprio elemento.
 *
 *   const jornadaRef = useProgressoScroll();
 *   <section ref={jornadaRef} className="jornada"> ... </section>
 *
 * O CSS faz o resto — opacidade, rotação, cross-fade saem todos de
 * calc() em cima dessa variável. A divisão é proposital: o JS só
 * responde "onde estamos", e nenhuma regra de aparência mora aqui.
 *
 * Por que não IntersectionObserver: ele avisa QUANDO um elemento cruza
 * um limiar, não o quanto ele avançou. Para animação contínua atrelada
 * ao scroll seria preciso encher o observer de dezenas de thresholds e
 * ainda assim receber a informação em degraus. getBoundingClientRect
 * num listener de scroll dá o valor contínuo direto.
 *
 * A leitura acontece dentro de requestAnimationFrame porque o evento de
 * scroll dispara mais vezes do que a tela repinta: sem o portão do rAF,
 * seriam vários layouts forçados por frame, e cada
 * getBoundingClientRect() no meio do caminho obriga o browser a
 * recalcular o layout na hora.
 */
export default function useProgressoScroll() {
  const elementoRef = useRef(null);

  useEffect(() => {
    const alvo = elementoRef.current;
    if (!alvo) return undefined;

    // Quem pediu menos movimento não recebe animação atrelada ao scroll:
    // o cenário fica no estado final, montado, e a variável nunca é
    // escrita. O CSS tem o fallback correspondente na media query.
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (semMovimento) return undefined;

    let agendado = false;

    const medir = () => {
      agendado = false;

      const caixa = alvo.getBoundingClientRect();
      // Distância que a seção precisa percorrer para atravessar a tela
      // por inteiro. Sem isto o progresso terminaria assim que o topo
      // saísse, e não quando o conteúdo acabasse de passar.
      const percurso = caixa.height - window.innerHeight;
      if (percurso <= 0) {
        alvo.style.setProperty('--progresso', '0');
        return;
      }

      const andado = Math.min(Math.max(-caixa.top, 0), percurso);
      alvo.style.setProperty('--progresso', (andado / percurso).toFixed(4));
    };

    const aoRolar = () => {
      if (agendado) return;
      agendado = true;
      window.requestAnimationFrame(medir);
    };

    medir();
    window.addEventListener('scroll', aoRolar, { passive: true });
    window.addEventListener('resize', aoRolar, { passive: true });

    return () => {
      window.removeEventListener('scroll', aoRolar);
      window.removeEventListener('resize', aoRolar);
    };
  }, []);

  return elementoRef;
}
