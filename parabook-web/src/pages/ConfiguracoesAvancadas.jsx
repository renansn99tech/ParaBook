import { useContext, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import ConfiguracoesAvancadasConteudo from '../components/ConfiguracoesAvancadas';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import swal, { BOTAO } from '../services/swal';
import '../assets/css/perfil.css';

function ConfiguracoesAvancadas() {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [excluindo, setExcluindo] = useState(false);

  const handleExcluirConta = async () => {
    if (excluindo) return;
    const confirmacao = await swal.fire({
      title: 'Confirme sua senha',
      text: 'Esta ação é irreversível. Sua conta, perfil e histórico serão apagados.',
      icon: 'warning',
      input: 'password',
      inputLabel: 'Senha atual',
      inputPlaceholder: 'Digite sua senha para confirmar',
      inputAttributes: { autocomplete: 'current-password' },
      showCancelButton: true,
      confirmButtonText: 'Excluir definitivamente',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: BOTAO.perigo,
      cancelButtonColor: BOTAO.neutro,
      inputValidator: (value) => !value && 'Informe sua senha atual.',
    });
    if (!confirmacao.isConfirmed) return;
    setExcluindo(true);
    try {
      await api.delete('/auth/excluir-conta/', { data: { senha_atual: confirmacao.value } });
      await logout();
      await swal.fire({ icon: 'success', title: 'Conta excluída', text: 'Sua conta foi excluída com sucesso.' });
      navigate('/');
    } catch (error) {
      swal.fire({ icon: 'error', title: 'Erro', text: error.response?.data?.detail || 'Não foi possível excluir sua conta. Tente novamente.' });
    } finally {
      setExcluindo(false);
    }
  };

  if (loading) {
    return <div className="text-center p-5" role="status">Carregando configurações...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="perfil-page perfil-configuracoes-page">
      <header className="configuracoes-page-header">
        <div>
          <span className="configuracoes-page-kicker">Conta ParaBook</span>
          <h1>Configurações avançadas</h1>
          <p>Segurança, privacidade e atalhos administrativos em uma página própria.</p>
        </div>
        <Link to="/perfil?tab=configuracoes" className="btn-outline">
          <i className="fa-solid fa-arrow-left" aria-hidden="true"></i>
          Voltar ao perfil
        </Link>
      </header>

      <div className="content-glass-card configuracoes-page-card">
        <ConfiguracoesAvancadasConteudo user={user} />
      </div>

      <section className="danger-zone content-glass-card configuracoes-page-danger" aria-labelledby="encerrar-conta-titulo">
        <div className="danger-text"><h2 id="encerrar-conta-titulo">Encerrar conta</h2><p>Esta ação apaga definitivamente sua conta, seu perfil e seu histórico. A senha atual será exigida.</p></div>
        <button type="button" className="btn-danger-outline" onClick={handleExcluirConta} disabled={excluindo} aria-busy={excluindo}><i className={`fa-solid ${excluindo ? 'fa-spinner fa-spin' : 'fa-trash'}`} aria-hidden="true"></i> {excluindo ? 'Excluindo...' : 'Excluir conta'}</button>
      </section>
    </main>
  );
}

export default ConfiguracoesAvancadas;
