import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import useTema from '../hooks/useTema';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/tela-login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const paginaRef = useRevelacao([]);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const { alternar, icone, rotulo } = useTema();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const success = await login(username, password);
    if (success) {
      navigate('/perfil');
    } else {
      setError('Credenciais inválidas. Tente novamente.');
    }
  };

  return (
    <div className="auth-body" ref={paginaRef}>
      <main className="auth-container">
        {/* Filhos diretos do quadro, não de uma coluna: abaixo de 1000px o
            lado visual some, e no cadastro os controles sumiriam junto. */}
        <div className="auth-controls">
          <button
            type="button"
            className="auth-ctrl"
            onClick={alternar}
            title={rotulo}
            aria-label={rotulo}
          >
            <i className={`fa-solid ${icone}`}></i>
          </button>

          <Link to="/" className="auth-ctrl" title="Voltar ao Menu" aria-label="Voltar ao Menu">
            <i className="fa-solid fa-arrow-left"></i>
          </Link>
        </div>

        <section className="auth-image-side">
          <div className="auth-sky"></div>
          <div className="auth-glow"></div>
          <div className="auth-stars"></div>
          <div className="auth-watermark"></div>
          <div className="auth-arc auth-arc-1"></div>
          <div className="auth-arc auth-arc-2"></div>

          <div className="auth-image-text" data-revelar>
            <div className="auth-brand">
              <i className="fa-solid fa-book-open-reader"></i>
              <h1 className="auth-wordmark">Para<span>Book</span></h1>
              <span className="auth-badge">Beta</span>
            </div>
            <p>Gerencie suas leituras, descubra novas comunidades e organize seu conhecimento em um ecossistema minimalista e performático.</p>
          </div>
        </section>

        <section className="auth-form-side">
          <div className="auth-card" data-revelar>
            <p className="auth-eyebrow">Bem-vindo de volta</p>
            <h3>Entrar no ParaBook</h3>
            <p className="auth-sub">Retome de onde parou.</p>

            {error && (
              <div className="auth-error-alert">
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="login-usuario">Usuário</label>
                <input
                  id="login-usuario"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="seu.usuario"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="login-senha">Senha</label>
                <input
                  id="login-senha"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
              </div>

              <Link to="/esqueci-senha" className="auth-forgot-link">Esqueceu a senha?</Link>

              <button type="submit" className="auth-btn-submit">Acessar Conta</button>

              <p className="auth-footer-text">
                Ainda não tem conta? <Link to="/register">Cadastre-se</Link>
              </p>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Login;
