import { useState, useContext, useEffect } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import swal from '../services/swal';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/tela-login.css';

function AceitarTermos() {
  const { user, loading, recarregarUsuario } = useContext(AuthContext);
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const [versaoTermos, setVersaoTermos] = useState('2026-08-13');
  const paginaRef = useRevelacao([loading, user]);

  useEffect(() => {
    api.get('/auth/governanca/')
      .then(({ data }) => setVersaoTermos(data.versao_termos))
      .catch(() => {});
  }, []);

  if (loading) {
    return <div className="text-center mt-5"><h2 style={{ color: 'var(--text)' }}>Carregando...</h2></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleAceitar = async () => {
    setEnviando(true);
    try {
      await api.post('/auth/aceitar-termos/');
      await recarregarUsuario();
      navigate('/perfil');
    } catch (error) {
      console.error("Erro ao aceitar termos", error);
      swal.fire({
        icon: 'error',
        title: 'Erro',
        text: 'Não foi possível registrar o aceite. Tente novamente.',
      });
      setEnviando(false);
    }
  };

  return (
    <main className="page-center" ref={paginaRef}>
      <div
        data-revelar
        className="surface-card surface-card--sm"
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <i className="fa-solid fa-file-shield surface-icon"></i>
            <h2 className="fw-bold mb-2">Atualização de Privacidade</h2>
            <p className="page-lead">
              Para continuar usando o ParaBook, precisamos que você revise nossos termos.
            </p>
          </div>

          <div className="surface-inset mb-4">
            <p className="mb-0">
              Em conformidade com a LGPD, atualizamos nossas políticas de retenção de dados e
              segurança de direitos autorais. Por favor, leia a{' '}
              <Link to="/diretrizes" target="_blank" rel="noreferrer">
                Política de Privacidade e Termos de Uso
              </Link>{' '}
              completa.
            </p>
            <p className="mb-0 mt-2"><strong>Versão:</strong> {versaoTermos}</p>
          </div>

          <button
            onClick={handleAceitar}
            className="btn-primary w-100 d-flex justify-content-center align-items-center gap-2"
            disabled={enviando}
          >
            <i className="fa-solid fa-check"></i>
            {enviando ? 'Registrando...' : 'Li e concordo com os Termos'}
          </button>
        </div>
      </div>
    </main>
  );
}

export default AceitarTermos;
