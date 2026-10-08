import api from './api';
import swal from './swal';

export async function prepararPedidoConselho(alvoTipo, alvoId) {
  const justificativa = await swal.fire({ title: 'Solicitar decisão do Conselho', text: 'O pedido prepara a análise. Remoção ou restauração exigirá duas aprovações distintas e conferência das travas.', input: 'textarea', inputLabel: 'Motivo e impacto', inputAttributes: { maxlength: 2000 }, inputValidator: (v) => v.trim().length < 20 && 'Descreva o motivo com pelo menos 20 caracteres.', showCancelButton: true, cancelButtonText: 'Cancelar', confirmButtonText: 'Continuar' });
  if (!justificativa.isConfirmed) return null;
  const chave = crypto.randomUUID();
  const senha = await swal.fire({ title: 'Confirmar sua identidade', input: 'password', inputLabel: 'Senha atual', inputAttributes: { autocomplete: 'current-password', maxlength: 128 }, showCancelButton: true, cancelButtonText: 'Cancelar', confirmButtonText: 'Preparar caso', showLoaderOnConfirm: true,
    preConfirm: async (valor) => {
      try {
        const r = await api.post('/dashboard/casos/', { acao: 'preparar_conselho', alvo_tipo: alvoTipo, alvo_id: alvoId, motivo: justificativa.value, senha_atual: valor, chave_idempotencia: chave });
        return r.data;
      } catch (e) { swal.showValidationMessage(Object.values(e.response?.data || {}).flat().join(' ') || 'Não foi possível preparar o caso. Tente novamente.'); return false; }
    },
  });
  return senha.isConfirmed ? senha.value : null;
}
