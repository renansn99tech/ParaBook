export function formatarTempoResumo(segundos) {
  const total = Math.max(0, Number(segundos) || 0);
  if (total < 60) return total > 0 ? 'Menos de 1 min' : 'Agora';
  if (total < 3600) return `${Math.round(total / 60)} min`;
  const horas = Math.floor(total / 3600);
  const minutos = Math.round((total % 3600) / 60);
  return minutos ? `${horas}h ${minutos}min` : `${horas}h`;
}
