import { useState, useEffect, useContext, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import swal from '../services/swal';
import CardComunidade from '../components/CardComunidade';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/comunidade.css';

// Toast do tema (reaproveita o swal já vestido com os tokens do ParaBook).
const toast = (title, icon = 'success') =>
  swal.fire({
    toast: true,
    position: 'top-end',
    timer: 2600,
    timerProgressBar: true,
    showConfirmButton: false,
    icon,
    title,
  });

const cardSkeleton = (key) => (
  <div className="card-comunidade card-comunidade--skeleton" key={key} aria-hidden="true">
    <div className="comunidade-topo">
      <span className="sk-monograma" />
      <div className="comunidade-identidade w-100">
        <span className="sk-linha sk-linha--titulo" />
        <span className="sk-linha sk-linha--curta" />
      </div>
    </div>
    <span className="sk-linha" />
    <span className="sk-linha sk-linha--curta" />
    <span className="sk-barra" />
    <span className="sk-pill" />
  </div>
);

function Comunidades() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const admin = Boolean(user?.is_superuser);
  const podeCriar = Boolean(user) && !admin;

  const [comunidadesOficiais, setComunidadesOficiais] = useState([]);
  const [comunidadesDaGalera, setComunidadesDaGalera] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas');
  const [busca, setBusca] = useState('');

  const paginaRef = useRevelacao([comunidadesOficiais, comunidadesDaGalera, loading, filtro, busca]);

  useEffect(() => {
    api.get('/comunidades/comunidades/')
      .then(res => {
        const data = res.data;
        setComunidadesOficiais(data.filter(c => c.criada_por_sistema));
        setComunidadesDaGalera(data.filter(c => !c.criada_por_sistema));
      })
      .catch(err => console.error("Erro ao carregar comunidades:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleToggleParticipacao = async (comunidade) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await api.post(`/comunidades/comunidades/${comunidade.id}/entrar/`);
      const entrou = response.data.status === 'entrou na comunidade';

      const updateList = (list) => list.map(c => {
        if (c.id === comunidade.id) {
          return {
            ...c,
            usuario_participa: entrou,
            total_membros: entrou ? (c.total_membros || 0) + 1 : (c.total_membros || 0) - 1,
          };
        }
        return c;
      });

      setComunidadesOficiais(prev => updateList(prev));
      setComunidadesDaGalera(prev => updateList(prev));

      toast(entrou ? `Você entrou em ${comunidade.nome}.` : `Você saiu de ${comunidade.nome}.`);
    } catch (error) {
      console.error("Erro ao alterar participação:", error);
      toast('Não foi possível concluir agora. Tente de novo.', 'error');
    }
  };

  const todas = useMemo(
    () => [...comunidadesOficiais, ...comunidadesDaGalera],
    [comunidadesOficiais, comunidadesDaGalera],
  );

  const contadores = {
    todas: todas.length,
    oficiais: comunidadesOficiais.length,
    galera: comunidadesDaGalera.length,
    minhas: todas.filter(c => c.usuario_participa).length,
  };

  const buscaLimpa = busca.trim().toLowerCase();
  const casaBusca = (c) =>
    !buscaLimpa ||
    (c.nome || '').toLowerCase().includes(buscaLimpa) ||
    (c.descricao || '').toLowerCase().includes(buscaLimpa);

  const casaFiltro = (c) => {
    if (filtro === 'oficiais') return c.criada_por_sistema;
    if (filtro === 'galera') return !c.criada_por_sistema;
    if (filtro === 'minhas') return c.usuario_participa;
    return true;
  };

  const visiveis = todas.filter(casaFiltro).filter(casaBusca);
  const mostrarDuasSecoes = filtro === 'todas' && buscaLimpa === '';

  // Rodapé por hierarquia: um gradiente por card, só no "você já está aqui".
  const renderRodape = (comunidade) => {
    if (admin) {
      return (
        <Link to={`/comunidade/${comunidade.id}/conteudo`} className="btn-ghost w-100">
          Moderar
        </Link>
      );
    }
    if (comunidade.usuario_participa) {
      return (
        <>
          <Link to={`/comunidade/${comunidade.id}/conteudo`} className="btn-primary comunidade-acessar">
            Acessar
          </Link>
          <button
            type="button"
            onClick={() => handleToggleParticipacao(comunidade)}
            className="btn-ghost comunidade-sair"
            aria-label={`Sair de ${comunidade.nome}`}
          >
            <i className="fa-solid fa-arrow-right-from-bracket" aria-hidden="true"></i>
          </button>
        </>
      );
    }
    if (comunidade.em_manutencao) {
      return (
        <span className="com-inerte">
          <i className="fa-solid fa-power-off" aria-hidden="true"></i>Desativada
        </span>
      );
    }
    if (comunidade.max_participantes && (comunidade.total_membros || 0) >= comunidade.max_participantes) {
      return (
        <span className="com-inerte">
          <i className="fa-solid fa-user-slash" aria-hidden="true"></i>Sem vagas
        </span>
      );
    }
    return (
      <button
        type="button"
        onClick={() => handleToggleParticipacao(comunidade)}
        className="btn-purple-soft w-100"
      >
        Entrar
      </button>
    );
  };

  const renderCard = (comunidade) => (
    <CardComunidade key={comunidade.id} comunidade={comunidade} user={user} data-revelar>
      {renderRodape(comunidade)}
    </CardComunidade>
  );

  const cardCriar = podeCriar ? (
    <Link to="/comunidades/criar" className="card-criar-comunidade-link" data-revelar>
      <div className="card-criar-comunidade">
        <span className="card-criar-icone" aria-hidden="true">
          <i className="fa-solid fa-plus"></i>
        </span>
        <div className="card-criar-content">
          <h4>Criar comunidade</h4>
          <p>Abra um espaço para o assunto que ainda não existe por aqui.</p>
        </div>
      </div>
    </Link>
  ) : null;

  // Copy do hero e das seções muda para admin.
  const eyebrow = admin ? 'Moderação de espaços' : 'Onde a leitura vira conversa';
  const lead = admin
    ? 'Todos os espaços da plataforma, oficiais e independentes, com as denúncias em aberto à vista.'
    : 'Escolha um espaço para participar: aqui você encontra gente lendo o mesmo que você e discussões que continuam depois da última página.';

  const secaoTitulo = (() => {
    if (buscaLimpa) return `Resultados para "${busca.trim()}"`;
    if (filtro === 'minhas') return 'Onde você participa';
    if (filtro === 'oficiais') return 'Espaços oficiais';
    return 'Comunidades da galera';
  })();

  const secaoOficial = !buscaLimpa && filtro === 'oficiais';

  const renderVazio = () => {
    let icone = 'fa-magnifying-glass';
    let titulo = `Nenhuma comunidade encontrada para "${busca.trim()}".`;
    let nota = 'Tente outro termo ou limpe a busca.';
    let comBotao = false;

    if (!buscaLimpa && filtro === 'minhas') {
      icone = 'fa-users';
      titulo = 'Você ainda não participa de nenhum espaço.';
      nota = 'Explore as comunidades e junte-se às conversas.';
      comBotao = true;
    } else if (!buscaLimpa && todas.length === 0) {
      icone = 'fa-comments';
      titulo = 'Nenhuma comunidade por aqui ainda.';
      nota = 'Que tal abrir a primeira?';
      comBotao = true;
    }

    return (
      <div className="com-vazio" data-revelar>
        <i className={`fa-solid ${icone}`} aria-hidden="true"></i>
        <h3>{titulo}</h3>
        <p>{nota}</p>
        {comBotao && podeCriar && (
          <Link to="/comunidades/criar" className="btn-primary">Criar a primeira</Link>
        )}
      </div>
    );
  };

  return (
    <main className="container py-4" ref={paginaRef}>
      <section className="pagina-comunidade">
        {/* Hero — não depende da API, aparece de cara. */}
        <header className="com-hero" data-revelar>
          <p className="com-hero-eyebrow">{eyebrow}</p>
          <h1 className="com-hero-titulo">Comunidades</h1>
          <p className={`com-hero-lead${admin ? ' com-hero-lead--full' : ''}`}>{lead}</p>
        </header>

        {admin && (
          <div className="com-admin-faixa" data-revelar role="note">
            <i className="fa-solid fa-shield-halved" aria-hidden="true"></i>
            <span>
              Visão de administração: participar e criar comunidades fica desativado. Aqui você só modera.
            </span>
          </div>
        )}

        {/* Barra de filtro e busca — client-side, sem chamada nova. */}
        <div className="com-toolbar" data-revelar>
          <div className="com-filtros" role="group" aria-label="Filtrar comunidades">
            {[
              { id: 'todas', rotulo: 'Todas', n: contadores.todas },
              { id: 'oficiais', rotulo: 'Oficiais', n: contadores.oficiais },
              { id: 'galera', rotulo: 'Da galera', n: contadores.galera },
              ...(podeCriar ? [{ id: 'minhas', rotulo: 'Minhas', n: contadores.minhas }] : []),
            ].map(({ id, rotulo, n }) => (
              <button
                key={id}
                type="button"
                className={`com-filtro${filtro === id ? ' is-ativo' : ''}`}
                aria-pressed={filtro === id}
                onClick={() => setFiltro(id)}
              >
                {rotulo}
                <span className="com-filtro-contador">{n}</span>
              </button>
            ))}
          </div>

          <div className="com-busca">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar comunidade"
              aria-label="Buscar comunidade por nome ou descrição"
            />
            {busca && (
              <button
                type="button"
                className="com-busca-limpar"
                onClick={() => setBusca('')}
                aria-label="Limpar busca"
              >
                <i className="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            )}
          </div>
        </div>

        {/* Grade — só ela mostra skeleton enquanto carrega. */}
        {loading ? (
          <div className="grid-comunidades" aria-busy="true">
            {[0, 1, 2].map(cardSkeleton)}
          </div>
        ) : mostrarDuasSecoes ? (
          <>
            <div className="com-secao is-oficial" data-revelar>
              <h2 className="com-secao-titulo">Espaços oficiais</h2>
              <p className="com-secao-nota">moderados e mantidos pelo ParaBook</p>
            </div>
            <div className="grid-comunidades com-folga" data-revelar-cascata>
              {comunidadesOficiais.length > 0
                ? comunidadesOficiais.map(renderCard)
                : (
                  <div className="com-vazio" data-revelar>
                    <i className="fa-solid fa-bookmark" aria-hidden="true"></i>
                    <h3>Nenhum espaço oficial no momento.</h3>
                  </div>
                )}
            </div>

            <div className="com-secao" data-revelar>
              <h2 className="com-secao-titulo">Comunidades da galera</h2>
              <p className="com-secao-nota">criadas por leitores e autores da plataforma</p>
            </div>
            <div className="grid-comunidades" data-revelar-cascata>
              {comunidadesDaGalera.map(renderCard)}
              {cardCriar}
            </div>
          </>
        ) : (
          <>
            <div className={`com-secao${secaoOficial ? ' is-oficial' : ''}`} data-revelar>
              <h2 className="com-secao-titulo">{secaoTitulo}</h2>
              <p className="com-secao-nota">{visiveis.length} {visiveis.length === 1 ? 'espaço' : 'espaços'}</p>
            </div>
            {visiveis.length > 0 ? (
              <div className="grid-comunidades" data-revelar-cascata>
                {visiveis.map(renderCard)}
                {filtro !== 'oficiais' && cardCriar}
              </div>
            ) : (
              renderVazio()
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default Comunidades;
