export function formatarTempoRelativo(data) {
  if (!data) return null;
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return null;
  const minutos = Math.round((valor.getTime() - Date.now()) / 60000);
  const formato = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (Math.abs(minutos) < 60) return formato.format(minutos, 'minute');
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return formato.format(horas, 'hour');
  return formato.format(Math.round(horas / 24), 'day');
}
