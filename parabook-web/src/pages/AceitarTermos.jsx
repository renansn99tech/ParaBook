import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import swal from '../services/swal';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../assets/css/tela-login.css';

function AceitarTermos() {
  const { user, loading, recarregarUsuario } = useContext(AuthContext);
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);

  if (loading) {
    return <div className="text-center mt-5"><h2 style={{ color: 'white' }}>Carregando...</h2></div>;
  }

  if (!user) {
    navigate('/login');
    return null;
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
    <main className="container" style={{ display: 'flex', justifyContent: 'center', padding: '80px 20px', minHeight: '75vh' }}>
      <div
        className="card border-0 shadow-lg rounded-4 text-white"
        style={{ maxWidth: '600px', width: '100%', background: '#12131C', backdropFilter: 'blur(10px)' }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <i className="fa-solid fa-file-shield" style={{ fontSize: '3rem', color: '#8b5cf6', marginBottom: '20px' }}></i>
            <h2 className="fw-bold text-white mb-2">Atualização de Privacidade</h2>
            <p className="text-white-50">
              Para continuar usando o ParaBook, precisamos que você revise nossos termos.
            </p>
          </div>

          <div
            className="p-4 rounded-3 mb-4"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <p className="mb-0" style={{ fontSize: '0.95rem', color: '#cbd5e1', lineHeight: '1.6' }}>
              Em conformidade com a LGPD, atualizamos nossas políticas de retenção de dados e
              segurança de direitos autorais. Por favor, leia a{' '}
              <Link to="/diretrizes" target="_blank" style={{ color: '#c084fc', textDecoration: 'underline', fontWeight: 600 }}>
                Política de Privacidade e Termos de Uso
              </Link>{' '}
              completa.
            </p>
          </div>

          <button
            onClick={handleAceitar}
            className="btn btn-primary w-100 py-3 rounded-3 fw-bold d-flex justify-content-center align-items-center gap-2"
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
