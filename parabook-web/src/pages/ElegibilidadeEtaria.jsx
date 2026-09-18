import { useContext, useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import '../assets/css/tela-login.css';

const formatarDataHora = (valor) => {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime())
    ? null
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(data);
};

function ElegibilidadeEtaria() {
  const { user, loading, recarregarUsuario, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [estado, setEstado] = useState(user?.restricao_etaria || null);
  const [dataNascimento, setDataNascimento] = useState('');
  const [confirmado, setConfirmado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!user) return;
    api.get('/auth/idade/')
      .then(({ data }) => setEstado(data))
      .catch(() => {});
  }, [user]);

  if (loading) {
    return <main className="page-center"><p role="status">Carregando elegibilidade...</p></main>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const bloqueadaParaCorrecao = Boolean(
    estado?.proxima_correcao_permitida_em
    && new Date(estado.proxima_correcao_permitida_em) > new Date(),
  );
  const proximaCorrecao = formatarDataHora(estado?.proxima_correcao_permitida_em);

  const enviarDeclaracao = async (evento) => {
    evento.preventDefault();
    if (!confirmado || !dataNascimento || enviando || bloqueadaParaCorrecao) return;
    setEnviando(true);
    setErro('');
    try {
      const { data } = await api.put('/auth/idade/', {
        data_nascimento: dataNascimento,
        chave_idempotencia: crypto.randomUUID(),
      });
      setDataNascimento('');
      setEstado(data);
      if (!data.restricao_ativa) {
        await recarregarUsuario();
        navigate('/perfil', { replace: true });
      }
    } catch (requestError) {
      const dados = requestError.response?.data;
      const mensagens = [
        ...(dados?.data_nascimento || []),
        ...(dados?.proxima_correcao_permitida_em || []),
      ];
      setErro(mensagens.join(' ') || dados?.detail || 'Não foi possível registrar a declaração. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="page-center" aria-labelledby="elegibilidade-titulo">
      <section className="surface-card surface-card--sm">
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <i className="fa-solid fa-shield-heart surface-icon" aria-hidden="true"></i>
            <h1 id="elegibilidade-titulo" className="fw-bold mb-2">Confirmação de elegibilidade</h1>
            <p className="page-lead">
              Para proteger a experiência literária, precisamos confirmar sua faixa etária.
              A data informada é privada e não aparecerá no seu perfil.
            </p>
          </div>

          {estado?.estado === 'restrito_menor' && (
            <div className="surface-inset mb-4" role="status">
              <strong>Conta em modo protegido.</strong> Algumas áreas ficam indisponíveis por enquanto.
              Se houver erro, use o suporte; não envie documentos por este formulário.
            </div>
          )}

          {bloqueadaParaCorrecao ? (
            <div className="surface-inset mb-4" role="status">
              Uma nova correção poderá ser enviada {proximaCorrecao ? `a partir de ${proximaCorrecao}` : 'após o prazo de segurança'}.
            </div>
          ) : (
            <form onSubmit={enviarDeclaracao} noValidate>
              <label className="form-label" htmlFor="elegibilidade-data">Data de nascimento</label>
              <input
                id="elegibilidade-data"
                type="date"
                className="form-control mb-3"
                value={dataNascimento}
                onChange={(evento) => setDataNascimento(evento.target.value)}
                max={new Date().toISOString().slice(0, 10)}
                required
              />
              <div className="form-check mb-3">
                <input
                  id="elegibilidade-confirmacao"
                  className="form-check-input"
                  type="checkbox"
                  checked={confirmado}
                  onChange={(evento) => setConfirmado(evento.target.checked)}
                />
                <label className="form-check-label" htmlFor="elegibilidade-confirmacao">
                  Confirmo que a informação é correta.
                </label>
              </div>
              {erro && <p className="text-danger" role="alert">{erro}</p>}
              <button
                type="submit"
                className="btn-primary w-100"
                disabled={!confirmado || !dataNascimento || enviando}
              >
                {enviando ? 'Registrando...' : 'Confirmar elegibilidade'}
              </button>
            </form>
          )}

          <div className="d-flex flex-wrap gap-3 justify-content-center mt-4">
            <Link to="/perfil/configuracoes/suporte">Falar com o suporte</Link>
            <Link to="/privacidade">Política de privacidade</Link>
            <button type="button" className="btn btn-link p-0" onClick={logout}>Sair</button>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ElegibilidadeEtaria;
