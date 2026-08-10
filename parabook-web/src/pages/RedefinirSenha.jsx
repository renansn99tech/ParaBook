import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import swal from '../services/swal';
import api from '../services/api';
import '../assets/css/password-reset.css';

function RedefinirSenha() {
  const { uid, token } = useParams();
  const navigate = useNavigate();

  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (novaSenha !== confirmarSenha) {
      setErro('A nova senha e a confirmação devem ser iguais.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/redefinir-senha/', {
        uid,
        token,
        nova_senha: novaSenha
      });

      await swal.fire({
        icon: 'success',
        title: 'Senha redefinida!',
        text: 'Sua senha foi alterada com sucesso. Faça login para continuar.'
      });
      navigate('/login');
    } catch (error) {
      console.error("Erro ao redefinir senha", error);
      const data = error.response?.data;
      const mensagens = data ? Object.values(data).flat() : [];
      setErro(mensagens.length > 0 ? mensagens.join(' ') : 'Não foi possível redefinir a senha. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-container">
        <h2>Criar Nova Senha</h2>
        <p className="reset-text">
          Escolha uma nova senha forte e segura para acessar sua conta.
        </p>

        {erro && (
          <div className="auth-error-alert" style={{ marginBottom: '20px' }}>
            <i className="fa-solid fa-triangle-exclamation"></i> {erro}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="novaSenha">Nova Senha</label>
            <input
              type="password"
              id="novaSenha"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              placeholder="Mínimo de 8 caracteres"
            />
          </div>

          <div style={{ marginBottom: '30px' }}>
            <label htmlFor="confirmarSenha">Confirmar Nova Senha</label>
            <input
              type="password"
              id="confirmarSenha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
              placeholder="Repita a nova senha"
            />
          </div>

          <button type="submit" className="reset-btn" disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/esqueci-senha" style={{ color: '#94a3b8', textDecoration: 'underline' }}>
            O link expirou? Solicitar novamente
          </Link>
        </div>
      </div>
    </div>
  );
}

export default RedefinirSenha;
