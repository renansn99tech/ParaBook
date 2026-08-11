import { useLayoutEffect, useRef } from 'react';

/**
 * Revelação por scroll — as seções entram na tela conforme o leitor rola,
 * em vez de já estarem todas lá.
 *
 * Como usar: pegue o ref, pendure num container, e marque o que deve
 * entrar com `data-revelar`. Quem faz a parte visual é o CSS (ver o bloco
 * REVELAÇÃO POR SCROLL em base.css); aqui só cuidamos de QUANDO cada
 * elemento passa a valer.
 *
 *   const containerRef = useRevelacao([listaQueVemDaApi]);
 *   <main ref={containerRef}> <section data-revelar> ... </section> </main>
 *
 * Um observer só para a página inteira, não um por elemento: o
 * IntersectionObserver aceita vários alvos, e o navegador resolve tudo
 * fora da thread principal — é justamente por isso que ele existe, no
 * lugar do velho listener de scroll que recalculava posição a cada pixel.
 *
 * O array de dependências existe por causa do conteúdo que chega depois:
 * na Home, novidades e comunidades vêm da API, então os cards nascem
 * DEPOIS da primeira passada. Passe os estados correspondentes e o hook
 * observa os que apareceram no meio do caminho.
 */
export default function useRevelacao(dependencias = []) {
  const containerRef = useRef(null);

  useLayoutEffect(() => {
    const raiz = containerRef.current;
    if (!raiz) return undefined;

    // O CSS só esconde o que está DENTRO de um container marcado, e quem
    // marca é esta linha. Se o JS falhar ou nem rodar, o atributo nunca
    // aparece e a página fica inteira visível — a animação é um bônus,
    // não um pré-requisito para ler o conteúdo.
    raiz.setAttribute('data-revelacao-ativa', '');

    const alvos = raiz.querySelectorAll('[data-revelar]:not([data-revelado])');
    if (!alvos.length) return undefined;

    const revelar = (elemento) => elemento.setAttribute('data-revelado', '');

    // Quem pediu menos movimento (ou usa um navegador sem o observer)
    // recebe tudo revelado de uma vez: o conteúdo é o mesmo, só chega
    // sem a entrada animada.
    const semMovimento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (semMovimento || typeof IntersectionObserver === 'undefined') {
      alvos.forEach(revelar);
      return undefined;
    }

    const observador = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (!entrada.isIntersecting) return;
          revelar(entrada.target);
          // Uma vez revelado, para de observar: a animação é de entrada,
          // não um efeito que deve refazer a cada ida e volta do scroll.
          observador.unobserve(entrada.target);
        });
      },
      {
        // A margem negativa embaixo segura o disparo até o elemento ter
        // entrado de verdade no campo de visão, e não no instante em que
        // encosta a primeira linha de pixels na borda da tela.
        rootMargin: '0px 0px -12% 0px',
        threshold: 0.08,
      },
    );

    alvos.forEach((elemento) => observador.observe(elemento));

    // Rede de segurança. Esconder conteúdo para animá-lo depois tem um
    // risco embutido: se a revelação não acontecer, o texto some de vez —
    // o custo de uma falha aqui não é "perdi a animação", é "perdi a
    // página". E o observer só entrega quando o navegador tem chance de
    // renderizar; numa aba que nunca é composta, ele simplesmente não
    // dispara (foi exatamente o que aconteceu ao validar isto).
    //
    // Então, um tempo depois, o que já deveria estar à vista pela
    // geometria é revelado na marra. O prazo só corre com a aba visível,
    // senão quem abre o link em segundo plano e volta depois perderia a
    // entrada animada sem necessidade.
    let cronometro;

    const armarRedeDeSeguranca = () => {
      window.clearTimeout(cronometro);
      if (document.visibilityState !== 'visible') return;

      cronometro = window.setTimeout(() => {
        raiz.querySelectorAll('[data-revelar]:not([data-revelado])').forEach((elemento) => {
          const caixa = elemento.getBoundingClientRect();
          const naTela = caixa.top < window.innerHeight && caixa.bottom > 0;
          if (naTela) revelar(elemento);
        });
      }, 2000);
    };

    armarRedeDeSeguranca();
    document.addEventListener('visibilitychange', armarRedeDeSeguranca);

    return () => {
      observador.disconnect();
      window.clearTimeout(cronometro);
      document.removeEventListener('visibilitychange', armarRedeDeSeguranca);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencias);

  return containerRef;
}
