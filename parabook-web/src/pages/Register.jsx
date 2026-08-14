import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import useTema from '../hooks/useTema';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/tela-login.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    termos_aceitos: false,
  });
  const [error, setError] = useState('');

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const { alternar, icone, rotulo } = useTema();
  const paginaRef = useRevelacao([]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    const result = await register(formData);
    if (result.success) {
      navigate('/perfil');
    } else {
      setError(result.error || 'Erro ao realizar o cadastro. Verifique os dados fornecidos.');
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
        title={rotulo}
        aria-label={rotulo}
      >
        <i className={`fa-solid ${icone}`}></i>
      </button>

      <main className="auth-container auth-container-register">
        <section className="auth-image-side">
          <div className="auth-image-text" data-revelar>
            <h2>Junte-se ao ParaBook</h2>
            <p>Crie sua conta para gerenciar sua biblioteca digital, interagir com comunidades e expandir seu conhecimento.</p>
          </div>
        </section>

        <section className="auth-form-side">
          <div className="auth-form-box login-box" data-revelar>
            <div className="auth-form-header">
              <h2>Criar Conta</h2>
              <p>Preencha os dados abaixo para começar sua jornada</p>
            </div>

            <form onSubmit={handleSubmit} noValidate className="auth-form pure-form">
              {error && (
                <div className="auth-error-alert">
                  <i className="fa-solid fa-triangle-exclamation"></i> {error}
                </div>
              )}

              <div className="auth-input-group">
                <input 
                  type="text" 
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required 
                  placeholder=" " 
                />
                <label>Usuário</label>
              </div>

              <div className="auth-input-group">
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required 
                  placeholder=" " 
                />
                <label>Email</label>
              </div>

              <div className="auth-input-group">
                <input 
                  type="password" 
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required 
                  placeholder=" " 
                />
                <label>Senha</label>
              </div>

              <div className="auth-checkbox-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', margin: '15px 0 25px 0', textAlign: 'left' }}>
                <input 
                  type="checkbox" 
                  name="termos_aceitos" 
                  checked={formData.termos_aceitos}
                  onChange={handleChange}
                  required 
                  style={{ width: '18px', height: '18px', accentColor: '#8b5cf6', marginTop: '3px', cursor: 'pointer' }} 
                />
                <div>
                  <label style={{ fontSize: '0.85rem', color: '#aeb3c7', lineHeight: '1.5', cursor: 'pointer', display: 'block' }}>
                    Li, compreendo e concordo com a <Link to="/diretrizes" target="_blank" rel="noreferrer" style={{ color: '#c084fc', textDecoration: 'underline', fontWeight: '600' }}>Política de Privacidade e Termos de Uso vigente</Link>.
                  </label>
                </div>
              </div>

              <button type="submit" className="auth-btn-submit">Cadastrar</button>

              <p className="auth-footer-text">
                Já possui uma conta? <Link to="/login">Acesse aqui</Link>
              </p>
            </form>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Register;
