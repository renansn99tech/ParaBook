import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const success = await register(formData);
    if (success) {
      navigate('/perfil');
    } else {
      setError('Erro ao realizar o cadastro. Verifique os dados fornecidos.');
    }
  };

  return (
    <div className="login-container d-flex justify-content-center align-items-center" style={{ minHeight: '80vh' }}>
      <div className="card p-5 shadow-lg border-0" style={{ maxWidth: '450px', width: '100%', background: 'var(--bg-card)' }}>
        <h2 className="text-center mb-4" style={{ color: 'white' }}>Cadastro ParaBook</h2>
        
        {error && <div className="alert alert-danger">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label style={{ color: 'var(--text-secondary)' }}>Usuário</label>
            <input 
              type="text" 
              name="username"
              className="form-control" 
              style={{ background: '#0d1427', border: '1px solid var(--border)', color: 'white' }}
              value={formData.username}
              onChange={handleChange}
              required 
            />
          </div>
          <div className="mb-3">
            <label style={{ color: 'var(--text-secondary)' }}>Email</label>
            <input 
              type="email" 
              name="email"
              className="form-control" 
              style={{ background: '#0d1427', border: '1px solid var(--border)', color: 'white' }}
              value={formData.email}
              onChange={handleChange}
              required 
            />
          </div>
          <div className="mb-4">
            <label style={{ color: 'var(--text-secondary)' }}>Senha</label>
            <input 
              type="password" 
              name="password"
              className="form-control" 
              style={{ background: '#0d1427', border: '1px solid var(--border)', color: 'white' }}
              value={formData.password}
              onChange={handleChange}
              required 
            />
          </div>
          
          <button type="submit" className="btn-primary w-100">
            Criar Conta
          </button>
        </form>
        
        <div className="text-center mt-4" style={{ color: 'var(--text-secondary)' }}>
          Já tem conta? <Link to="/login" style={{ color: 'var(--purple)' }}>Faça Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
