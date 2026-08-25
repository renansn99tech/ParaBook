import { useEffect } from 'react';

function ToastAdmin({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(onClose, 2600);
    return () => window.clearTimeout(timer);
  }, [onClose, toast]);

  if (!toast) return null;
  return (
    <div className={`aa-toast aa-toast--${toast.tipo || 'sucesso'}`} role="status">
      <i className={`fa-solid ${toast.tipo === 'erro' ? 'fa-circle-exclamation' : 'fa-circle-check'}`} aria-hidden="true"></i>
      <span>{toast.mensagem}</span>
    </div>
  );
}

export default ToastAdmin;
