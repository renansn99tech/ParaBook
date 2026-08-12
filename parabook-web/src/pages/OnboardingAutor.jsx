import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import swal from '../services/swal';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';

function OnboardingAutor() {
  const { user, loading, recarregarUsuario } = useContext(AuthContext);
  const navigate = useNavigate();
  const [enviando, setEnviando] = useState(false);
  const paginaRef = useRevelacao([loading, user]);

  if (loading) {
    return <div className="text-center mt-5"><h2 style={{ color: 'var(--text)' }}>Carregando...</h2></div>;
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  // Mesma guarda da API: quem ja e autor, admin ou aguarda analise nao refaz o onboarding.
  const jaSolicitou = ['autor', 'admin', 'aguardando_aprovacao'].includes(user.tipo);

  const handleSolicitar = async () => {
    setEnviando(true);
    try {
      const res = await api.post('/perfis/solicitar-autor/');
      await recarregarUsuario();
      await swal.fire({
        icon: 'success',
        title: 'Solicitação enviada!',
        text: res.data.detail});
      navigate('/perfil');
    } catch (error) {
      console.error("Erro ao solicitar perfil de autor", error);
      swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.response?.data?.detail || 'Não foi possível enviar sua solicitação. Tente novamente.'
      });
      setEnviando(false);
    }
  };

  return (
    <main className="container" ref={paginaRef} style={{ display: 'flex', justifyContent: 'center', padding: '60px 20px', minHeight: '75vh' }}>
      <div
        data-revelar
        className="card border-0 shadow-lg rounded-4 text-white"
        style={{ maxWidth: '750px', width: '100%', background: '#12131C', backdropFilter: 'blur(10px)' }}
      >
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <i className="fa-solid fa-feather-pointed" style={{ fontSize: '3.5rem', color: '#8b5cf6', marginBottom: '20px' }}></i>
            <h2 className="fw-bold text-white mb-2">Programa de Autores Independentes</h2>
            <p className="text-white-50 fs-5">
              Antes de habilitarmos seu painel de publicação, você precisa conhecer suas responsabilidades legais.
            </p>
          </div>

          <div
            className="p-4 rounded-4 mb-4"
            style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(139,92,246,0.15)' }}
          >
            <h5 className="mb-3" style={{ color: '#c4b5fd' }}>
              <i className="fa-solid fa-scale-balanced me-2"></i>Termos de Responsabilidade Autoral
            </h5>

            <ul style={{ color: '#cbd5e1', lineHeight: '1.7', paddingLeft: '20px', marginBottom: 0 }}>
              <li className="mb-3">
                <strong>Propriedade Intelectual:</strong> Você só pode publicar obras das quais é o
                autor original ou possui os direitos legais expressos de distribuição.
              </li>
              <li className="mb-3">
                <strong>Tolerância Zero à Pirataria:</strong> O upload de PDFs ou livros protegidos
                por direitos autorais (de terceiros) resultará no banimento imediato da sua conta.
              </li>
              <li className="mb-3">
                <strong>Identificação Legal:</strong> Para proteção jurídica da plataforma, será
                obrigatório fornecer o seu <strong>CPF</strong> válido no momento do envio de cada obra.
              </li>
              <li>
                <strong>Direitos Retidos:</strong> Você não cede seus direitos autorais ao ParaBook;
                apenas concede a licença gratuita para exibirmos a obra na nossa biblioteca digital.
              </li>
            </ul>
          </div>

          {jaSolicitou ? (
            <div className="text-center">
              <div className="alert alert-info" role="alert">
                {user.tipo === 'aguardando_aprovacao'
                  ? 'Sua solicitação já está em análise pela nossa equipe de moderação.'
                  : 'Você já possui privilégios de publicação no ParaBook.'}
              </div>
              <Link to="/perfil" className="btn-ghost">
                Ir para Meu Perfil
              </Link>
            </div>
          ) : (
            <div className="d-flex flex-wrap gap-3 justify-content-center">
              <Link to="/perfil" className="btn-ghost">
                Cancelar
              </Link>
              <button
                onClick={handleSolicitar}
                className="btn-primary"
                disabled={enviando}
              >
                <i className="fa-solid fa-check-double me-2"></i>
                {enviando ? 'Enviando...' : 'Compreendi as regras e Quero ser Autor'}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default OnboardingAutor;
