export function formatarDataNascimento(data) {
  if (!data) return 'Não informada';
  const partesIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const partesBr = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(data);
  const partes = partesIso
    ? [partesIso[3], partesIso[2], partesIso[1]]
    : partesBr?.slice(1);
  if (!partes) return data;
  const [dia, mes, ano] = partes.map(Number);
  const valor = new Date(ano, mes - 1, dia);
  if (valor.getFullYear() !== ano || valor.getMonth() !== mes - 1 || valor.getDate() !== dia) {
    return 'Não informada';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(valor);
}
