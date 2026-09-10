import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import '../assets/css/suspensao.css';

const formatarRestante = (segundos) => {
  const total = Math.max(0, segundos);
  const dias = Math.floor(total / 86400);
  const horas = Math.floor((total % 86400) / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  return `${dias}d ${horas}h ${minutos}min`;
};

function SuspensionNotice({ suspensao }) {
  const termino = useMemo(() => new Date(suspensao.termina_em).getTime(), [suspensao.termina_em]);
  const [segundos, setSegundos] = useState(() => Math.max(0, Math.ceil((termino - Date.now()) / 1000)));

  useEffect(() => {
    const atualizar = () => setSegundos(Math.max(0, Math.ceil((termino - Date.now()) / 1000)));
    atualizar();
    const timer = window.setInterval(atualizar, 30000);
    return () => window.clearInterval(timer);
  }, [termino]);

  const restante = formatarRestante(segundos);
  const explicacao = `Conta suspensa. Ações pessoais estão bloqueadas por mais ${restante}.`;
  return <aside className="suspensao-aviso" role="status" aria-live="polite" title={explicacao}><i className="fa-solid fa-hourglass-half" aria-hidden="true"></i><span><strong>Conta temporariamente suspensa</strong><small>Você navega como visitante. Configurações e suporte continuam disponíveis · {restante}</small></span><Link to="/perfil/configuracoes/suporte">Falar com o suporte</Link></aside>;
}

export default SuspensionNotice;
