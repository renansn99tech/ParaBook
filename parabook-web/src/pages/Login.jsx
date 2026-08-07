import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../assets/css/tela-login.css';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

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
    <div className="auth-body">
      <Link to="/" className="btn-voltar-fixo" title="Voltar ao Menu" style={{ 
          position: 'fixed', top: '20px', right: '20px', width: '50px', height: '50px',
          background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(10px)', 
          border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '50%', 
          color: '#94a3b8', textDecoration: 'none', display: 'flex', 
          alignItems: 'center', justifyContent: 'center', zIndex: 1000, transition: 'all 0.3s ease',
          fontSize: '1.2rem'
      }}>
        <i className="fa-solid fa-arrow-left"></i>
      </Link>

      <main className="auth-container">
        <section className="auth-image-side">
          <div className="auth-image-overlay"></div>
          <div className="abstract-glow-1"></div>
          <div className="abstract-glow-2"></div>
          <div className="auth-image-text">
            <div className="brand-logo-login">
              <i className="fa-solid fa-book-open-reader animate-book"></i>
              <h1 className="logo-text">Para<span>Book</span></h1>
            </div>
            <p>Gerencie suas leituras, descubra novas comunidades e organize seu conhecimento em um ecossistema minimalista e performático.</p>
          </div>
        </section>

        <section className="auth-form-side">
          <div className="auth-box login-box">
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
