/**
 * Núcleo do tema, sem React nem DOM.
 *
 * O rodízio de temas e os rótulos do botão são a parte que mais quebra em
 * silêncio: se a ordem muda, se "tarde" some da lista ou se o ícone/rótulo
 * deixa de casar com o tema, nada estoura no build — a tela só fica errada.
 * Por isso a lógica vive aqui, em funções puras que dá para testar sem
 * montar o React (ver tema-core.test.js). O hook useTema apenas liga estas
 * funções ao DOM, ao localStorage e ao estado.
 *
 * Os três são temas completos de UI: o base.css tem bloco de superfície
 * para `escuro`, `tarde` e `claro`, então redefinir os canais faz o app
 * inteiro virar junto. A landing e as telas de auth ainda ganham céus
 * artesanais próprios (tokens --pb- e --pa- escopados) por cima desta base.
 */
export const ORDEM = ['escuro', 'tarde', 'claro'];

export const TEMA_PADRAO = 'escuro';

export function ehTemaValido(tema) {
  return ORDEM.includes(tema);
}

export function normalizarTema(tema) {
  return ehTemaValido(tema) ? tema : TEMA_PADRAO;
}

export function proximoTema(tema) {
  const atual = normalizarTema(tema);
  return ORDEM[(ORDEM.indexOf(atual) + 1) % ORDEM.length];
}

// O ícone mostra o tema ATUAL (lua = está de noite); o rótulo anuncia o
// PRÓXIMO. São coisas diferentes de propósito: o desenho serve de indicador
// de estado e o texto — que é o que o leitor de tela lê ao focar o botão —
// precisa dizer o que o clique vai fazer.
export const ICONES = { escuro: 'fa-moon', tarde: 'fa-cloud-sun', claro: 'fa-sun' };

export const ROTULOS = {
  escuro: 'Mudar para o tema escuro',
  tarde: 'Mudar para o tema de fim de tarde',
  claro: 'Mudar para o tema claro',
};

export function iconePara(tema) {
  return ICONES[normalizarTema(tema)];
}

export function rotuloProximo(tema) {
  return ROTULOS[proximoTema(tema)];
}
