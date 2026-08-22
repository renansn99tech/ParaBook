import swal from './swal';

/**
 * Modal "Termine seu cadastro".
 *
 * Coleta os três campos que deixam o perfil com a cara do usuário — Nome de
 * Exibição, Localização e Frase de status — todos opcionais (dá para salvar só
 * o que quiser). Os botões são "Terminar depois" (cancelar) e "Salvar"
 * (confirmar). A decisão de QUANDO abrir e o que fazer com o resultado fica com
 * quem chama (ver pages/Profile.jsx); aqui é só a UI.
 *
 * Retorna o resultado do SweetAlert: `isConfirmed` diz se foi "Salvar" e
 * `value` traz `{ nome, localizacao, descricao_perfil }` quando confirmado.
 */
const escapar = (texto) =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export function abrirOnboardingPerfil(iniciais = {}) {
  const nome = escapar(iniciais.nome);
  const localizacao = escapar(iniciais.localizacao);
  const frase = escapar(iniciais.descricao_perfil);

  return swal.fire({
    title: 'Termine seu cadastro',
    html: `
      <p class="onboarding-perfil-intro">
        Adicione alguns detalhes para deixar seu perfil com a sua cara.
        Você pode pular e completar depois.
      </p>
      <div class="onboarding-perfil-campos">
        <label class="onboarding-perfil-label" for="onb-nome">Nome de Exibição</label>
        <input id="onb-nome" class="onboarding-perfil-input" type="text"
               value="${nome}" maxlength="45" placeholder="Como quer ser chamado(a)" />

        <label class="onboarding-perfil-label" for="onb-local">Localização</label>
        <input id="onb-local" class="onboarding-perfil-input" type="text"
               value="${localizacao}" maxlength="100" placeholder="Cidade, Estado" />

        <label class="onboarding-perfil-label" for="onb-frase">Frase de status</label>
        <input id="onb-frase" class="onboarding-perfil-input" type="text"
               value="${frase}" maxlength="45" placeholder="Uma frase que te represente" />
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    reverseButtons: true, // deixa "Terminar depois" à esquerda e "Salvar" à direita
    confirmButtonText: 'Salvar',
    cancelButtonText: 'Terminar depois',
    preConfirm: () => ({
      nome: document.getElementById('onb-nome')?.value.trim() ?? '',
      localizacao: document.getElementById('onb-local')?.value.trim() ?? '',
      descricao_perfil: document.getElementById('onb-frase')?.value.trim() ?? '',
    }),
  });
}
