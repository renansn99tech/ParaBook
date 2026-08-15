import { useContext, useState, useEffect, useRef } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import swal, { BOTAO } from '../services/swal';
import api from '../services/api';
import userImg from '../assets/img/user.png';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/perfil.css'; // O CSS importado

/** Card usado nas abas sem conteúdo, para a aba nunca aparecer simplesmente vazia. */
function EstadoVazio({ icone, titulo, texto, acao }) {
  return (
    <div className="content-glass-card full-width perfil-vazio">
      <i className={`fa-solid ${icone}`}></i>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      {acao && (
        <Link to={acao.to} className="btn-primary-action">
          {acao.label}
        </Link>
      )}
    </div>
  );
}

function Profile() {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('info');
  const [fullProfile, setFullProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const paginaRef = useRevelacao([fullProfile, activeTab, loadingProfile]);
  const fotoInputRef = useRef(null);

  useEffect(() => {
    if (user?.username) {
      api.get(`/perfis/${user.username}/`)
        .then(res => setFullProfile(res.data))
        .catch(err => console.error("Erro ao carregar perfil completo", err))
        .finally(() => setLoadingProfile(false));
    } else if (!loading) {
      setLoadingProfile(false);
    }
  }, [loading, user]);

  // Mocks para fallback se a API não retornar
  const stats = fullProfile?.estatisticas || {
    total_lidos: 0,
    lendo_agora: 0, // A ser implementado
    total_avaliados: 0,
    total_comunidades: 0
  };

  const livrosFavoritos = fullProfile?.favoritos?.livros || [];
  const minhasComunidades = fullProfile?.comunidades || [];

  if (loading || loadingProfile) {
    return <div className="text-center mt-5 text-white">Carregando perfil...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Mesmo fluxo do template legado: confirma, chama a exclusão transacional
  // da API e derruba a sessão local.
  const handleExcluirConta = async () => {
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
      inputValidator: (value) => !value && 'Informe sua senha atual.'
    });

    if (!confirmacao.isConfirmed) return;

    try {
      await api.delete('/auth/excluir-conta/', {
        data: { senha_atual: confirmacao.value }
      });
      await logout();
      await swal.fire({
        icon: 'success',
        title: 'Conta excluída',
        text: 'Sua conta foi excluída com sucesso. Esperamos te ver novamente no futuro!'
      });
      navigate('/');
    } catch (error) {
      console.error("Erro ao excluir conta", error);
      swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.response?.data?.detail || 'Não foi possível excluir sua conta. Tente novamente.'
      });
    }
  };

  // Envia o arquivo escolhido para a API em multipart. O Content-Type precisa
  // ser sobrescrito aqui: o axios base manda application/json, e com esse header
  // ele serializaria o FormData como JSON (o arquivo se perderia).
  const handleTrocarFoto = async (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    // Bloqueia tudo que não for imagem. Whitelist de formatos web seguros;
    // se o browser não informar o MIME, cai para a checagem por extensão.
    const TIPOS_IMAGEM = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    const extensaoOk = /\.(png|jpe?g|webp|gif)$/i.test(arquivo.name);
    const ehImagemValida = arquivo.type ? TIPOS_IMAGEM.includes(arquivo.type) : extensaoOk;
    if (!ehImagemValida) {
      swal.fire({
        icon: 'error',
        title: 'Formato não suportado',
        text: 'Envie uma imagem nos formatos PNG, JPG, WEBP ou GIF.',
      });
      evento.target.value = '';
      return;
    }
    const LIMITE_MB = 5;
    if (arquivo.size > LIMITE_MB * 1024 * 1024) {
      swal.fire({ icon: 'error', title: 'Imagem muito grande', text: `O limite é ${LIMITE_MB} MB.` });
      evento.target.value = '';
      return;
    }

    const dados = new FormData();
    dados.append('foto', arquivo);
    try {
      await api.patch('/perfis/meu-perfil/', dados, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      swal.fire({
        icon: 'success',
        title: 'Foto atualizada!',
        text: 'Sua nova foto de perfil já está no ar.',
      }).then(() => window.location.reload());
    } catch (error) {
      console.error('Erro ao trocar foto', error);
      swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível atualizar a foto. Tente novamente.' });
    } finally {
      // Permite reescolher o MESMO arquivo depois de um erro (o onChange só
      // dispara se o valor mudar).
      evento.target.value = '';
    }
  };

  // Remove a foto atual mandando foto=null: o backend limpa a referência e o
  // avatar volta para a imagem padrão.
  const handleRemoverFoto = async () => {
    const confirmacao = await swal.fire({
      title: 'Remover foto?',
      text: 'Sua foto atual será removida e o avatar voltará para a imagem padrão.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Remover',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: BOTAO.perigo,
      cancelButtonColor: BOTAO.neutro,
    });
    if (!confirmacao.isConfirmed) return;

    try {
      await api.patch('/perfis/meu-perfil/', { foto: null });
      swal.fire({
        icon: 'success',
        title: 'Foto removida',
        text: 'Voltamos para o avatar padrão.',
      }).then(() => window.location.reload());
    } catch (error) {
      console.error('Erro ao remover foto', error);
      swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível remover a foto. Tente novamente.' });
    }
  };

  return (
    <main className="perfil-page" ref={paginaRef}>
      {/* PERFIL HEADER */}
      <section className="perfil-header-container" data-revelar>
        <div className="perfil-cover">
          {/* Capa com gradiente e blur inspirado na Home */}
        </div>

        <div className="perfil-content-wrapper">
          <div className="perfil-sidebar">
            <div className="perfil-avatar-box">
              <img
                src={fullProfile?.perfil?.foto || user?.foto || userImg}
                alt="Avatar do usuário"
                className="perfil-avatar"
                decoding="async"
                width="176"
                height="176"
              />

              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                ref={fotoInputRef}
                onChange={handleTrocarFoto}
                hidden
              />

              <button
                type="button"
                className="avatar-acao avatar-acao--trocar"
                onClick={() => fotoInputRef.current?.click()}
                aria-label="Trocar foto de perfil"
                title="Trocar foto"
              >
                <i className="fa-solid fa-camera"></i>
              </button>

              {Boolean(user?.foto || fullProfile?.perfil?.foto) && (
                <button
                  type="button"
                  className="avatar-acao avatar-acao--remover"
                  onClick={handleRemoverFoto}
                  aria-label="Remover foto de perfil"
                  title="Remover foto"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              )}
            </div>
          </div>

          <div className="perfil-main-info glass-card">
            <div className="info-header">
              <h1 className="perfil-nome">
                {user?.nome || 'Usuário'}
                {user?.tipo === 'admin' && <span className="badge badge-admin"><i className="fa-solid fa-shield-halved"></i> Admin</span>}
                {user?.tipo === 'autor' && <span className="badge badge-autor"><i className="fa-solid fa-feather-pointed"></i> Autor</span>}
                {user?.tipo === 'aguardando_aprovacao' && <span className="badge badge-pendente"><i className="fa-solid fa-clock-rotate-left"></i> Em Análise</span>}
                {user?.tipo === 'leitor' && <span className="badge badge-leitor"><i className="fa-solid fa-book-open"></i> Leitor</span>}
              </h1>
              <p className="perfil-username">@{user?.username}</p>
            </div>

            <div className="info-body">
              <p className="perfil-descricao"><i className="fa-solid fa-quote-left"></i> {fullProfile?.perfil?.descricao_perfil || user?.descricao_perfil || 'Sem status'}</p>
              <p className="perfil-historico">
                <i className="fa-solid fa-clock-rotate-left"></i>
                Último lido: <strong>{stats.ultimo_lido || 'Nenhum livro lido'}</strong>
              </p>

              <div className="perfil-meta">
                <div className="meta-item">
                  <i className="fa-solid fa-location-dot"></i>
                  <div>
                    <span className="meta-label">Localização</span>
                    <span className="meta-value">{fullProfile?.perfil?.localizacao || user?.localizacao || 'Desconhecida'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ESTATÍSTICAS */}
      <section className="perfil-stats-grid" data-revelar-cascata>
        <div className="stat-glass-card" data-revelar>
          <div className="stat-icon"><i className="fa-solid fa-book-open"></i></div>
          <div className="stat-info">
            <p className="stat-number">{stats.total_lidos}</p>
            <p className="stat-label">Livros Lidos</p>
          </div>
        </div>
        <div className="stat-glass-card" data-revelar>
          <div className="stat-icon"><i className="fa-solid fa-book-reader"></i></div>
          <div className="stat-info">
            <p className="stat-number">{stats.lendo_agora}</p>
            <p className="stat-label">Lendo Agora</p>
          </div>
        </div>
        <div className="stat-glass-card" data-revelar>
          <div className="stat-icon"><i className="fa-solid fa-star"></i></div>
          <div className="stat-info">
            <p className="stat-number">{stats.total_avaliados}</p>
            <p className="stat-label">Avaliados</p>
          </div>
        </div>
        <div className="stat-glass-card" data-revelar>
          <div className="stat-icon"><i className="fa-solid fa-users"></i></div>
          <div className="stat-info">
            <p className="stat-number">{stats.total_comunidades}</p>
            <p className="stat-label">Comunidades</p>
          </div>
        </div>
      </section>

      {/* ABAS DE NAVEGAÇÃO */}
      <section className="perfil-tabs-section" data-revelar>
        <div className="tabs-nav">
          <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>
            <i className="fa-solid fa-circle-info"></i> Informações
          </button>
          <button className={`tab-btn ${activeTab === 'favoritos' ? 'active' : ''}`} onClick={() => setActiveTab('favoritos')}>
            <i className="fa-solid fa-heart"></i> Favoritos
          </button>
          <button className={`tab-btn ${activeTab === 'comunidades' ? 'active' : ''}`} onClick={() => setActiveTab('comunidades')}>
            <i className="fa-solid fa-users"></i> Comunidades
          </button>
          <button className={`tab-btn ${activeTab === 'configuracoes' ? 'active' : ''}`} onClick={() => setActiveTab('configuracoes')}>
            <i className="fa-solid fa-gear"></i> Configurações
          </button>
        </div>

        {/* TAB INFO */}
        {activeTab === 'info' && (
          <div className="tab-content active">
            <div className="perfil-info-grid">
              <div className="content-glass-card full-width">
                <h3>Sobre Você</h3>
                <p className="sobre-texto">{user?.bio || 'Nenhuma biografia informada.'}</p>
                <button className="btn-primary-action" onClick={async () => {
                  const { value: text } = await swal.fire({
                    input: 'textarea',
                    inputLabel: 'Sua Biografia',
                    inputPlaceholder: 'Escreva um pouco sobre você...',
                    inputValue: user?.bio || '',
                    showCancelButton: true,
                    confirmButtonText: 'Salvar',
                    cancelButtonText: 'Cancelar',
                    cancelButtonColor: BOTAO.perigo
                  });

                  if (text !== undefined) {
                    try {
                      await api.patch('/perfis/meu-perfil/', { bio: text });
                      swal.fire({
                        icon: 'success',
                        title: 'Atualizado!',
                        text: 'Sua biografia foi atualizada com sucesso.',
                      }).then(() => window.location.reload());
                    } catch {
                      swal.fire({
                        icon: 'error',
                        title: 'Erro',
                        text: 'Falha ao atualizar biografia.',
                      });
                    }
                  }
                }}>
                  <i className="fa-solid fa-pen-to-square"></i> Trocar Biografia
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB FAVORITOS */}
        {activeTab === 'favoritos' && (
          <div className="tab-content active">
            {livrosFavoritos.length === 0 ? (
              <EstadoVazio
                icone="fa-heart-crack"
                titulo="Ainda não há livros favoritados"
                texto="Marque um livro com o coração durante a leitura para vê-lo aqui."
                acao={{ to: '/biblioteca', label: 'Explorar a Biblioteca' }}
              />
            ) : (
              <div className="favoritos-grid full">
                {livrosFavoritos.map((livro) => (
                  <div key={livro.id} className="favorito-card content-glass-card">
                    <div className="favorito-capa">
                      {livro.capa ? (
                        <img src={livro.capa} alt={`Capa do livro ${livro.titulo}`} loading="lazy" decoding="async" width="180" height="250" />
                      ) : (
                        <i className="fa-solid fa-book-open fs-1 text-white-50"></i>
                      )}
                    </div>
                    <div className="favorito-info">
                      <h4>{livro.titulo}</h4>
                      <p>{livro.autor}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB COMUNIDADES */}
        {activeTab === 'comunidades' && (
          <div className="tab-content active">
            {minhasComunidades.length === 0 ? (
              <EstadoVazio
                icone="fa-users-slash"
                titulo="Você ainda não participa de comunidades"
                texto="Entre em um espaço de discussão para acompanhar as conversas sobre os livros que você ama."
                acao={{ to: '/comunidades', label: 'Explorar Comunidades' }}
              />
            ) : (
              <div className="favoritos-grid full">
                {minhasComunidades.map((comunidade) => (
                  <div key={comunidade.id} className="favorito-card content-glass-card">
                    <div className="favorito-capa">
                      <i className="fa-solid fa-users"></i>
                    </div>
                    <div className="favorito-info">
                      <h4>{comunidade.nome}</h4>
                      <p>{comunidade.descricao}</p>
                      <Link to={`/comunidade/${comunidade.id}/conteudo`} className="btn-outline">
                        Acessar Comunidade
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB CONFIGURAÇÕES */}
        {activeTab === 'configuracoes' && (
          <div className="tab-content active">
            <div className="config-container content-glass-card full-width">
              <h2>Configurações da Conta</h2>
              <form className="config-form" onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());
                data.perfil_privado = formData.get('perfil_privado') === 'on';

                // Os dados agora vão direto, pois nome e username podem ser editados

                try {
                  await api.patch('/perfis/meu-perfil/', data);
                  swal.fire({
                    icon: 'success',
                    title: 'Sucesso!',
                    text: 'Configurações salvas com sucesso.',
                  }).then(() => window.location.reload());
                } catch (error) {
                  console.error(error);
                  swal.fire({
                    icon: 'error',
                    title: 'Ops...',
                    text: 'Erro ao salvar as configurações.',
                  });
                }
              }}>
                <div className="form-grid">
                  {user?.tipo !== 'admin' && (
                    <div className="perfil-form-group full-width perfil-privacidade">
                      <div>
                        <h4><i className="fa-solid fa-user-shield me-2"></i> Modo de Privacidade da Conta</h4>
                        <p>Ao ativar, seu perfil ficará oculto para leitores e autores comuns do ParaBook.</p>
                      </div>
                      <label className="switch-ui">
                        <input type="checkbox" name="perfil_privado" defaultChecked={user?.perfil_privado || false} />
                        <span className="slider-ui"></span>
                      </label>
                    </div>
                  )}
                  <div className="perfil-form-group">
                    <label htmlFor="input-nome">Nome de Exibição</label>
                    <input type="text" id="input-nome" name="nome" className="form-input" defaultValue={user?.nome} />
                  </div>
                  <div className="perfil-form-group">
                    <label htmlFor="input-username">Nome de Usuário (Username)</label>
                    <input type="text" id="input-username" name="username" className="form-input" defaultValue={user?.username} />
                  </div>
                  <div className="perfil-form-group">
                    <label htmlFor="input-descricao">Frase de Status (Curta)</label>
                    <input type="text" id="input-descricao" name="descricao_perfil" className="form-input" defaultValue={fullProfile?.perfil?.descricao_perfil || user?.descricao_perfil || ''} />
                  </div>
                  <div className="perfil-form-group">
                    <label htmlFor="input-localizacao">Localização / Cidade</label>
                    <input type="text" id="input-localizacao" name="localizacao" className="form-input" defaultValue={fullProfile?.perfil?.localizacao || user?.localizacao || ''} />
                  </div>
                </div>
                <button type="submit" className="btn-primary-action mt-4">
                  <i className="fa-solid fa-floppy-disk"></i> Salvar Alterações
                </button>
              </form>

              <div className="danger-zone">
                <div className="danger-text">
                  <h4>Segurança da Conta</h4>
                  <p>Gerencie sua senha ou encerre sua conta.</p>
                </div>
                <div className="danger-actions">
                  <Link to="/perfil/alterar-senha" className="btn-outline">
                    Alterar Senha
                  </Link>
                  <button className="btn-danger-outline" onClick={handleExcluirConta}>
                    <i className="fa-solid fa-trash"></i> Excluir conta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* PAINEIS ESPECÍFICOS DE TIPO DE USUÁRIO */}
      {user?.tipo === 'admin' && (
        <section data-revelar className="special-panel admin-panel content-glass-card">
          <div className="panel-info">
            <h3><i className="fa-solid fa-server"></i> Central de Comando</h3>
            <p>Você tem privilégios totais. Acesse o dashboard para gerenciar a plataforma.</p>
          </div>
          <Link to="/dashboard" className="btn-primary-action">Acessar Dashboard <i className="fa-solid fa-arrow-right"></i></Link>
        </section>
      )}

      {user?.tipo === 'autor' && (
        <section data-revelar className="special-panel autor-panel content-glass-card">
          <div className="panel-info">
            <h3><i className="fa-solid fa-wand-magic-sparkles"></i> Painel do Autor Independente</h3>
            <p>Gerencie suas publicações e veja o alcance das suas obras.</p>
          </div>
          <Link to="/publicar" className="btn-primary-action"><i className="fa-solid fa-plus"></i> Publicar Novo Livro</Link>
        </section>
      )}

      {user?.tipo === 'aguardando_aprovacao' && (
        <section data-revelar className="special-panel pendente-panel content-glass-card">
          <div className="panel-info">
            <h3 className="perfil-analise-titulo"><i className="fa-solid fa-hourglass-half"></i> Solicitação em Análise</h3>
            <p>Nossa equipe de moderação está avaliando seu pedido para se tornar Autor Independente.</p>
          </div>
        </section>
      )}

      {user?.tipo === 'leitor' && (
        <section data-revelar className="special-panel upgrade-panel content-glass-card">
          <div className="panel-info">
            <h3>Escreve ou deseja publicar suas próprias obras?</h3>
            <p>Mude sua conta para Autor Independente e comece a compartilhar suas histórias.</p>
          </div>
          <Link to="/autor/onboarding" className="btn-primary-action">
            <i className="fa-solid fa-feather"></i> Quero ser um Autor
          </Link>
        </section>
      )}
    </main>
  );
}

export default Profile;
