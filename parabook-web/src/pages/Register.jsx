import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import useTema from '../hooks/useTema';
import useRevelacao from '../hooks/useRevelacao';
import openBookImg from '../assets/img/open-book.png';
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
      <main className="auth-container auth-container-register">
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

        {/* Grid espelhado: no cadastro o formulário vem primeiro. */}
        <section className="auth-form-side">
          <div className="auth-card" data-revelar>
            <p className="auth-eyebrow">Comece sua jornada</p>
            <h3>Criar Conta</h3>
            <p className="auth-sub">Preencha os dados abaixo para começar.</p>

            {error && (
              <div className="auth-error-alert">
                <i className="fa-solid fa-triangle-exclamation"></i> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-field">
                <label htmlFor="reg-usuario">Usuário</label>
                <input
                  id="reg-usuario"
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  placeholder="seu.usuario"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="reg-email">E-mail</label>
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="voce@email.com"
                />
              </div>

              <div className="auth-field">
                <label htmlFor="reg-senha">Senha</label>
                <input
                  id="reg-senha"
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  placeholder="••••••••"
                />
              </div>

              <div className="auth-terms">
                <input
                  id="reg-termos"
                  type="checkbox"
                  name="termos_aceitos"
                  checked={formData.termos_aceitos}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="reg-termos">
                  Li, compreendo e concordo com a{' '}
                  <Link to="/diretrizes" target="_blank" rel="noreferrer">
                    Política de Privacidade e Termos de Uso vigente
                  </Link>.
                </label>
              </div>

              <button type="submit" className="auth-btn-submit">Cadastrar</button>

              <p className="auth-footer-text">
                Já possui uma conta? <Link to="/login">Acesse aqui</Link>
              </p>
            </form>
          </div>
        </section>

        <section className="auth-image-side">
          <div className="auth-sky"></div>
          <div className="auth-glow"></div>
          <div className="auth-stars"></div>

          {/* Livro e anéis entram ANTES dos arcos: o horizonte passa na
              frente deles, que é o que os ancora no céu. */}
          <div className="auth-orbit" aria-hidden="true">
            <div className="auth-ring auth-ring-1">
              <span className="auth-dot"></span>
              <span className="auth-dot"></span>
            </div>
            <div className="auth-ring auth-ring-2">
              <span className="auth-dot"></span>
              <span className="auth-dot"></span>
            </div>
            <img src={openBookImg} alt="" className="auth-book" />
          </div>

          <div className="auth-arc auth-arc-1"></div>
          <div className="auth-arc auth-arc-2"></div>

          <div className="auth-image-text" data-revelar>
            <h2>Junte-se ao Para<span>Book</span></h2>
            <p>Crie sua conta para gerenciar sua biblioteca digital, interagir com comunidades e expandir seu conhecimento.</p>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Register;
