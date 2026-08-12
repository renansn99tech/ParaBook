import Swal from 'sweetalert2';

/**
 * SweetAlert já vestido com o tema do ParaBook.
 *
 * Antes, cada tela que abria um modal declarava o próprio tema — o mesmo
 * `{ background: '#1e293b', color: '#fff', confirmButtonColor: '#8b5cf6' }`
 * repetido em 12 arquivos. Além da duplicação, era hex cravado: os modais
 * ficariam escuros num tema claro, porque estilo inline vence qualquer CSS.
 *
 * Os valores abaixo apontam para os tokens de base.css. O SweetAlert
 * aplica isso como estilo inline no popup, e `var()` em estilo inline
 * resolve normalmente contra o elemento — então o modal acompanha o tema
 * junto com o resto do app, sem nenhum trabalho extra na hora de trocar.
 *
 * Uso: `import swal from '../services/swal'` e chame `swal.fire({...})`
 * sem passar cor nenhuma. Para o botão de confirmação de uma ação
 * destrutiva ou de sucesso, use as constantes de BOTAO.
 */
const swal = Swal.mixin({
  background: 'var(--bg-card)',
  color: 'var(--text)',
  confirmButtonColor: 'var(--purple)',
  cancelButtonColor: 'var(--bg-card-hover)',
});

/**
 * Cores de botão por intenção, seguindo a mesma regra dos botões do app:
 * vermelho só para o que não tem volta.
 */
export const BOTAO = {
  padrao: 'var(--purple)',
  perigo: 'var(--danger)',
  sucesso: 'var(--success)',
  neutro: 'var(--bg-card-hover)',
};

export default swal;
