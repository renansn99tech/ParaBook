import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import '../assets/css/password-reset.css';

function EsqueciSenha() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');
    setLoading(true);

    try {
      await api.post('/auth/recuperar-senha/', { email });
      setEnviado(true);
    } catch (error) {
      console.error("Erro ao solicitar recuperação de senha", error);
      const data = error.response?.data;
      const mensagens = data ? Object.values(data).flat() : [];
      setErro(mensagens.length > 0 ? mensagens.join(' ') : 'Não foi possível enviar o e-mail. Tente novamente em instantes.');
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <div className="reset-page">
        <div className="reset-container">
          <div style={{ textAlign: 'center' }}>
            <i className="fa-solid fa-envelope-circle-check" style={{ fontSize: '3rem', color: '#8b5cf6', marginBottom: '20px' }}></i>
            <h2>Verifique seu e-mail</h2>
            <p className="reset-text">
              Se houver uma conta associada a <strong>{email}</strong>, enviamos as instruções
              para redefinir sua senha. O link é válido por tempo limitado.
            </p>
            <Link to="/login" className="reset-btn" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '10px' }}>
              Voltar para o login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reset-page">
      <div className="reset-container">
        <h2>Recuperar Senha</h2>
        <p className="reset-text">
          Informe o e-mail cadastrado na sua conta e enviaremos um link para você criar uma nova senha.
        </p>

        {erro && (
          <div className="auth-error-alert" style={{ marginBottom: '20px' }}>
            <i className="fa-solid fa-triangle-exclamation"></i> {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '30px' }}>
            <label htmlFor="email">E-mail</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Digite seu e-mail cadastrado"
            />
          </div>

          <button type="submit" className="reset-btn" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'underline' }}>
            Lembrei minha senha, voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default EsqueciSenha;
