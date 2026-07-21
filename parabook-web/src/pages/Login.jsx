import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

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
    <div className="login-container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="card p-5 shadow-lg border-0" style={{ maxWidth: '450px', width: '100%', background: 'var(--bg-card)' }}>
        <h2 className="text-center mb-4" style={{ color: 'white' }}>Entrar no ParaBook</h2>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label style={{ color: 'var(--text-secondary)' }}>Usuário</label>
            <input 
              type="text" 
              className="form-control" 
              style={{ background: '#0d1427', border: '1px solid var(--border)', color: 'white' }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
            />
          </div>
          <div className="mb-4">
            <label style={{ color: 'var(--text-secondary)' }}>Senha</label>
            <input 
              type="password" 
              className="form-control" 
              style={{ background: '#0d1427', border: '1px solid var(--border)', color: 'white' }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn-primary w-100">
            Entrar
          </button>
        </form>
        
        <div className="text-center mt-4" style={{ color: 'var(--text-secondary)' }}>
          Ainda não tem conta? <Link to="/register" style={{ color: 'var(--purple)' }}>Cadastre-se</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;
