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
  const [exportando, setExportando] = useState(false);

  const handleExportarDados = async () => {
    if (exportando) return;
    setExportando(true);
    let url;
    try {
      const resposta = await api.get('/auth/exportar-dados/', { responseType: 'blob' });
      url = URL.createObjectURL(resposta.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'parabook-meus-dados.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      swal.fire({ icon: 'error', title: 'Exportação indisponível', text: 'Tente novamente ou solicite seus dados pelo atendimento de privacidade.' });
    } finally {
      // A navegação do download precisa consumir o Blob antes da liberação.
      if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setExportando(false);
    }
  };

  const handleExcluirConta = async () => {
    if (excluindo) return;
    const confirmacao = await swal.fire({
      title: 'Confirme sua senha',
      text: 'O acesso será encerrado agora. Os dados serão descartados conforme os prazos de privacidade, preservando somente provas necessárias e respostas de outras pessoas.',
      icon: 'warning',
      input: 'password',
      inputLabel: 'Senha atual',
      inputPlaceholder: 'Digite sua senha para confirmar',
      inputAttributes: { autocomplete: 'current-password' },
      showCancelButton: true,
      confirmButtonText: 'Encerrar conta',
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
      await swal.fire({ icon: 'success', title: 'Conta encerrada', text: 'Seu acesso foi encerrado. O descarte seguirá os prazos de privacidade; cópias e provas necessárias têm tratamento separado.' });
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
        <ConfiguracoesAvancadasConteudo user={user} onExportarDados={handleExportarDados} exportando={exportando} />
      </div>

      <section className="danger-zone content-glass-card configuracoes-page-danger" aria-labelledby="encerrar-conta-titulo">
        <div className="danger-text"><h2 id="encerrar-conta-titulo">Encerrar conta</h2><p>O acesso será bloqueado agora. O descarte seguirá os prazos de privacidade, com tratamento separado de cópias e provas necessárias. A senha atual será exigida.</p></div>
        <button type="button" className="btn-danger-outline" onClick={handleExcluirConta} disabled={excluindo} aria-busy={excluindo}><i className={`fa-solid ${excluindo ? 'fa-spinner fa-spin' : 'fa-trash'}`} aria-hidden="true"></i> {excluindo ? 'Encerrando...' : 'Encerrar conta'}</button>
      </section>
      <section className="content-glass-card configuracoes-page-export" aria-labelledby="exportar-dados-titulo">
        <h2 id="exportar-dados-titulo">Meus dados</h2>
        <p>Baixe os dados disponíveis da sua conta em JSON, com resumo, cobertura e indicação dos itens que precisam de atendimento assistido.</p>
        <button type="button" className="btn-outline" onClick={handleExportarDados} disabled={exportando} aria-busy={exportando}>
          {exportando ? 'Preparando arquivo...' : 'Baixar meus dados'}
        </button>
      </section>
    </main>
  );
}

export default ConfiguracoesAvancadas;
