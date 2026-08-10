import { useCallback, useEffect, useState } from 'react';

const CHAVE = 'parabookTema';

/**
 * Tema claro/escuro do ParaBook.
 *
 * O valor real mora num atributo `data-tema` no <html>, não no estado do
 * React: quem pinta é o CSS (ver o bloco TEMA CLARO em base.css), e o
 * script no <head> do index.html já define o atributo antes da primeira
 * pintura. Este hook só lê o que está lá e permite trocar — assim não
 * existe uma segunda fonte de verdade capaz de divergir do que a tela
 * está mostrando.
 *
 * A escolha do usuário é gravada em localStorage e passa a valer acima
 * da preferência do sistema. Enquanto ele não escolher nada, o app
 * acompanha o sistema, inclusive se a pessoa trocar com o app aberto.
 */
function lerTemaAtual() {
  if (typeof document === 'undefined') return 'escuro';
  return document.documentElement.getAttribute('data-tema') === 'claro' ? 'claro' : 'escuro';
}

export default function useTema() {
  const [tema, setTema] = useState(lerTemaAtual);

  const aplicar = useCallback((proximo) => {
    document.documentElement.setAttribute('data-tema', proximo);
    setTema(proximo);
    try {
      localStorage.setItem(CHAVE, proximo);
    } catch {
      // Modo anônimo em alguns browsers barra o localStorage. A troca
      // continua valendo nesta sessão; só não sobrevive ao reload.
    }
  }, []);

  const alternar = useCallback(() => {
    aplicar(lerTemaAtual() === 'claro' ? 'escuro' : 'claro');
  }, [aplicar]);

  // Acompanha o sistema enquanto o usuário não tiver escolhido um tema.
  useEffect(() => {
    const consulta = window.matchMedia('(prefers-color-scheme: light)');

    const aoMudar = (evento) => {
      let salvo = null;
      try {
        salvo = localStorage.getItem(CHAVE);
      } catch {
        salvo = null;
      }
      if (salvo) return; // escolha explícita vence o sistema

      const proximo = evento.matches ? 'claro' : 'escuro';
      document.documentElement.setAttribute('data-tema', proximo);
      setTema(proximo);
    };

    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);

  return { tema, alternar, ehClaro: tema === 'claro' };
}
