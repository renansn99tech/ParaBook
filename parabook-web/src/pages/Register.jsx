import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import useTema from '../hooks/useTema';
import useRevelacao from '../hooks/useRevelacao';
import openBook480 from '../assets/img/open-book-480.webp';
import openBook768 from '../assets/img/open-book-768.webp';
import '../assets/css/tela-login.css';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    termos_aceitos: false,
  });
  const [error, setError] = useState('');
  // Erros por campo, para marcar o input exato que falhou (ex: username em uso).
  const [fieldErrors, setFieldErrors] = useState({});

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const { alternar, icone, rotulo } = useTema();
  const paginaRef = useRevelacao([]);

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
    // Limpa o erro do campo assim que a pessoa começa a corrigi-lo.
    if (fieldErrors[e.target.name]) {
      setFieldErrors((anteriores) => {
        const atualizados = { ...anteriores };
        delete atualizados[e.target.name];
        return atualizados;
      });
    }
  };

  // Normaliza o valor do DRF (array ou string) para uma frase só.
  const mensagemCampo = (campo) => {
    const valor = fieldErrors[campo];
    if (!valor) return '';
    return Array.isArray(valor) ? valor.join(' ') : String(valor);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    // Confirmação de senha checada no cliente antes de bater na API.
    if (formData.password !== formData.password_confirm) {
      setFieldErrors({ password_confirm: 'As senhas não conferem.' });
      setError('As senhas não conferem. Verifique a confirmação.');
      return;
    }

    const result = await register(formData);
    if (result.success) {
      navigate('/perfil');
    } else {
      setError(result.error || 'Erro ao realizar o cadastro. Verifique os dados fornecidos.');
      setFieldErrors(result.fieldErrors || {});
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
            <h1 className="auth-title">Criar Conta</h1>
            <p className="auth-sub">Preencha os dados abaixo para começar.</p>

            {error && (
              <div className="auth-error-alert" id="register-error" role="alert">
                <i className="fa-solid fa-triangle-exclamation" aria-hidden="true"></i> {error}
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
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={fieldErrors.username ? 'reg-usuario-erro' : undefined}
                  placeholder="seu.usuario"
                />
                {fieldErrors.username && (
                  <p className="auth-field-error" id="reg-usuario-erro">
                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {mensagemCampo('username')}
                  </p>
                )}
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
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'register-error' : undefined}
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
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'reg-senha-erro' : undefined}
                  placeholder="••••••••"
                />
                {fieldErrors.password && (
                  <p className="auth-field-error" id="reg-senha-erro">
                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {mensagemCampo('password')}
                  </p>
                )}
              </div>

              <div className="auth-field">
                <label htmlFor="reg-senha-confirma">Confirmar senha</label>
                <input
                  id="reg-senha-confirma"
                  type="password"
                  name="password_confirm"
                  autoComplete="new-password"
                  value={formData.password_confirm}
                  onChange={handleChange}
                  required
                  aria-invalid={Boolean(fieldErrors.password_confirm)}
                  aria-describedby={fieldErrors.password_confirm ? 'reg-senha-confirma-erro' : undefined}
                  placeholder="••••••••"
                />
                {fieldErrors.password_confirm && (
                  <p className="auth-field-error" id="reg-senha-confirma-erro">
                    <i className="fa-solid fa-circle-exclamation" aria-hidden="true"></i> {mensagemCampo('password_confirm')}
                  </p>
                )}
              </div>

              <div className="auth-terms">
                <input
                  id="reg-termos"
                  type="checkbox"
                  name="termos_aceitos"
                  checked={formData.termos_aceitos}
                  onChange={handleChange}
                  required
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'register-error' : undefined}
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
            <img
              src={openBook480}
              srcSet={`${openBook480} 480w, ${openBook768} 768w`}
              sizes="330px"
              alt=""
              className="auth-book"
              width="768"
              height="512"
              decoding="async"
            />
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
