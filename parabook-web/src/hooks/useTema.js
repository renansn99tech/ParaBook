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
/**
 * Ordem do rodízio. Os três são temas completos de UI: o base.css tem
 * bloco de superfície para `claro` e para `tarde`, então redefinir os
 * canais faz o app inteiro virar junto. A landing e as telas de auth
 * ainda ganham céus artesanais próprios (tokens --pb- e --pa- escopados)
 * por cima dessa base.
 */
const ORDEM = ['escuro', 'tarde', 'claro'];

function lerTemaAtual() {
  if (typeof document === 'undefined') return 'escuro';
  const atual = document.documentElement.getAttribute('data-tema');
  return ORDEM.includes(atual) ? atual : 'escuro';
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
    const atual = lerTemaAtual();
    aplicar(ORDEM[(ORDEM.indexOf(atual) + 1) % ORDEM.length]);
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

  // O ícone mostra o tema ATUAL (lua = está de noite); o rótulo anuncia o
  // PRÓXIMO. São coisas diferentes de propósito: o desenho serve de
  // indicador de estado, e o texto — que é o que o leitor de tela lê ao
  // focar o botão — precisa dizer o que o clique vai fazer. Fica aqui
  // para os três lugares que trocam tema (navbar, login, registro) não
  // reimplementarem o rodízio cada um.
  const proximo = ORDEM[(ORDEM.indexOf(tema) + 1) % ORDEM.length];
  const icone = { escuro: 'fa-moon', tarde: 'fa-cloud-sun', claro: 'fa-sun' }[tema];
  const rotulo = {
    escuro: 'Mudar para o tema escuro',
    tarde: 'Mudar para o tema de fim de tarde',
    claro: 'Mudar para o tema claro',
  }[proximo];

  return { tema, alternar, ehClaro: tema === 'claro', icone, rotulo };
}
