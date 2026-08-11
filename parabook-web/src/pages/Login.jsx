import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
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
  const { alternar, ehClaro } = useTema();

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
      <Link to="/" className="btn-voltar-fixo" title="Voltar ao Menu">
        <i className="fa-solid fa-arrow-left"></i>
      </Link>

      <button
        id="theme-toggle"
        type="button"
        onClick={alternar}
        aria-pressed={ehClaro}
        title={ehClaro ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'}
        aria-label={ehClaro ? 'Mudar para o tema escuro' : 'Mudar para o tema claro'}
      >
        <i className={`fa-solid ${ehClaro ? 'fa-moon' : 'fa-sun'}`}></i>
      </button>

      <main className="auth-container">
        <section className="auth-image-side">
          <div className="auth-image-overlay"></div>
          <div className="abstract-glow-1"></div>
          <div className="abstract-glow-2"></div>
          <div className="auth-image-text" data-revelar>
            <div className="brand-logo-login">
              <i className="fa-solid fa-book-open-reader animate-book"></i>
              <h1 className="logo-text">Para<span>Book</span></h1>
            </div>
            <p>Gerencie suas leituras, descubra novas comunidades e organize seu conhecimento em um ecossistema minimalista e performático.</p>
          </div>
        </section>

        <section className="auth-form-side">
          <div className="auth-box login-box" data-revelar>
            <form onSubmit={handleSubmit} noValidate className="pure-form">
              <h2>Entrar no ParaBook</h2>
              <p className="auth-subtitle">Seja bem-vindo de volta!</p>

              {error && (
                <div className="auth-error-alert">
                  <i className="fa-solid fa-triangle-exclamation"></i> {error}
                </div>
              )}

              <div className="auth-input-group">
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required 
                  placeholder=" " 
                />
                <label>Usuário</label>
              </div>

              <div className="auth-input-group">
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  placeholder=" " 
                />
                <label>Senha</label>
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
