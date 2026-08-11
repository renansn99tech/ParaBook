import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import swal from '../services/swal';
import api from '../services/api';
import '../assets/css/password-reset.css';

function AlterarSenha() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [senhaAntiga, setSenhaAntiga] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);

  // Se não estiver logado, nem renderiza o form (o AuthContext/App já protege a rota, mas é bom garantir)
  if (!user) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (novaSenha !== confirmarSenha) {
      swal.fire({
        icon: 'error',
        title: 'Senhas incompatíveis',
        text: 'A nova senha e a confirmação devem ser iguais.',
      });
      return;
    }

    if (novaSenha.length < 8) {
      swal.fire({
        icon: 'error',
        title: 'Senha muito curta',
        text: 'A nova senha deve ter no mínimo 8 caracteres.',
      });
      return;
    }

    setLoading(true);

    try {
      await api.post('/auth/alterar-senha/', {
        senha_antiga: senhaAntiga,
        nova_senha: novaSenha
      });

      swal.fire({
        icon: 'success',
        title: 'Sucesso!',
        text: 'Sua senha foi alterada com sucesso.',
      }).then(() => {
        navigate('/perfil');
      });
    } catch (error) {
      console.error("Erro ao alterar senha", error);
      
      const errorMessage = error.response?.data?.error || 'Verifique se a sua senha atual está correta.';
      
      swal.fire({
        icon: 'error',
        title: 'Erro ao alterar senha',
        text: errorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-page">
      <div className="reset-container">
        <h2>Alterar Senha</h2>
        <p className="reset-text">
          Crie uma nova senha forte e segura para a sua conta.
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="senhaAntiga">Senha Atual</label>
            <input
              type="password"
              id="senhaAntiga"
              value={senhaAntiga}
              onChange={(e) => setSenhaAntiga(e.target.value)}
              required
              placeholder="Digite sua senha atual"
            />
          </div>

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
          <button 
            type="button" 
            onClick={() => navigate('/perfil')} 
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Cancelar e voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export default AlterarSenha;
