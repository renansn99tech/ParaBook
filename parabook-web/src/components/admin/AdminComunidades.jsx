import { useState, useEffect } from 'react';
import swal, { BOTAO } from '../../services/swal';
import api from '../../services/api';
import CriadorDesconhecido, { EXPLICACAO_CRIADOR_DESCONHECIDO } from '../CriadorDesconhecido';

// Espelha MIN_DENUNCIAS_PARA_EXCLUSAO da API: aqui é só para o aviso ao admin;
// quem barra de fato a exclusão é o servidor.
const MIN_DENUNCIAS_EXCLUSAO = 10;

function AdminComunidades() {
  const [comunidades, setComunidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('todas'); // todas, sistema, usuarios

  // Form State
  const [formData, setFormData] = useState({
    nome: '',
    descricao: ''
  });

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const res = await api.get('/comunidades/comunidades/');
        // Assumindo que a resposta do endpoint do DRF ModelViewSet traga results
        const lista = res.data.results || res.data;
        setComunidades(lista);
      } catch (error) {
        console.error("Erro ao buscar comunidades", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // A API já marca `criada_por_sistema` e a lotação de sala oficial quando
      // quem cria é superusuário, então o cliente não envia esses campos.
      const res = await api.post('/comunidades/comunidades/', formData);
      setComunidades([res.data, ...comunidades]);
      setFormData({ nome: '', descricao: '' });
      swal.fire({
        icon: 'success',
        title: 'Comunidade oficial criada!',
        text: `"${res.data.nome}" já está disponível para os leitores.`
      });
    } catch (error) {
      console.error("Erro ao criar comunidade oficial", error);
      const dados = error.response?.data;
      const mensagem = dados?.detail
        || Object.values(dados || {}).flat()[0]
        || 'Não foi possível criar a comunidade oficial.';

      swal.fire({ icon: 'error', title: 'Ops', text: mensagem});
    }
  };

  const handleExcluir = async (comunidade) => {
    // Sala oficial é da casa: basta a confirmação do admin.
    if (comunidade.criada_por_sistema) {
      const confirmacao = await swal.fire({
        icon: 'warning',
        title: 'Excluir comunidade oficial?',
        html: `<strong>${comunidade.nome}</strong> e todas as suas postagens serão removidas. Esta ação não pode ser desfeita.`,
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: BOTAO.perigo
      });

      if (!confirmacao.isConfirmed) return;
      await executarExclusao(comunidade);
      return;
    }

    // Sala de usuário exige lastro de denúncias: mostramos o placar antes.
    const denuncias = comunidade.total_denuncias || 0;
    const faltam = MIN_DENUNCIAS_EXCLUSAO - denuncias;
    const atingiuMinimo = faltam <= 0;

    const confirmacao = await swal.fire({
      icon: atingiuMinimo ? 'warning' : 'info',
      title: atingiuMinimo ? 'Excluir comunidade denunciada?' : 'Denúncias insuficientes',
      html: `
        <p style="margin-bottom:14px"><strong>${comunidade.nome}</strong> — criado por ${comunidade.criador_nome ? `@${comunidade.criador_nome}` : `<span class="criador-desconhecido" tabindex="0" data-tooltip="${EXPLICACAO_CRIADOR_DESCONHECIDO}">Desconhecido</span>`}</p>
        <p style="margin-bottom:6px">Denúncias registradas:
          <strong style="color:${atingiuMinimo ? '#fca5a5' : '#fcd34d'}">${denuncias}</strong> de ${MIN_DENUNCIAS_EXCLUSAO}
        </p>
        ${atingiuMinimo
          ? '<p style="color:#fca5a5;margin:0">A comunidade atingiu o limite e pode ser removida.</p>'
          : `<p style="color:#94a3b8;margin:0">Faltam <strong>${faltam}</strong> denúncia(s) para liberar a exclusão.</p>`}
      `,
      showCancelButton: atingiuMinimo,
      confirmButtonText: atingiuMinimo ? 'Sim, excluir' : 'Entendi',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: atingiuMinimo ? BOTAO.perigo : BOTAO.padrao
    });

    if (atingiuMinimo && confirmacao.isConfirmed) {
      await executarExclusao(comunidade);
    }
  };

  const executarExclusao = async (comunidade) => {
    try {
      await api.delete(`/comunidades/comunidades/${comunidade.id}/`);
      setComunidades(comunidades.filter(c => c.id !== comunidade.id));
      swal.fire({
        icon: 'success',
        title: 'Comunidade excluída',
        text: `"${comunidade.nome}" foi removida da plataforma.`
      });
    } catch (error) {
      console.error("Erro ao excluir comunidade", error);
      swal.fire({
        icon: 'error',
        title: 'Erro',
        text: error.response?.data?.detail || 'Não foi possível excluir a comunidade.'
      });
    }
  };

  const filtradas = comunidades.filter(c => {
    if (filtro === 'sistema') return c.criada_por_sistema === true;
    if (filtro === 'usuarios') return c.criada_por_sistema === false;
    return true;
  });

  const totalSistema = comunidades.filter(c => c.criada_por_sistema).length;
  const totalUsuarios = comunidades.filter(c => !c.criada_por_sistema).length;

  return (
    <section className="secao">
      <div className="admin-secao-topo">
        <div>
          <h1>Gerenciar Comunidades</h1>
          <p className="admin-subtitulo">Controle de ecossistemas literários e moderação de salas.</p>
        </div>

        <form className="admin-form-inline" onSubmit={handleSubmit}>
          <input
            type="text"
            name="nome"
            placeholder="Nome da Comunidade Oficial"
            value={formData.nome}
            onChange={handleChange}
            required
          />
          <input
            type="text"
            name="descricao"
            placeholder="Descrição Curta"
            value={formData.descricao}
            onChange={handleChange}
            required
          />
          <button type="submit">+ Criar Oficial</button>
        </form>
      </div>

      {/* aria-pressed carrega o estado do filtro: o CSS pinta a partir dele
          e o leitor de tela anuncia qual está ativo. */}
      <div className="admin-filtros">
        <button className="admin-filtro" aria-pressed={filtro === 'todas'} onClick={() => setFiltro('todas')}>
          Todas ({comunidades.length})
        </button>
        <button className="admin-filtro" aria-pressed={filtro === 'sistema'} onClick={() => setFiltro('sistema')}>
          Do Sistema ({totalSistema})
        </button>
        <button className="admin-filtro" aria-pressed={filtro === 'usuarios'} onClick={() => setFiltro('usuarios')}>
          Dos Usuários ({totalUsuarios})
        </button>
      </div>

      <div className="admin-panel admin-list-container">
        {loading ? (
          <p className="admin-estado">Carregando...</p>
        ) : filtradas.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Criador</th>
                <th>Membros</th>
                <th>Denúncias</th>
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(comum => (
                <tr key={comum.id}>
                  <td>{comum.nome}</td>
                  <td>{comum.criada_por_sistema ? 'Sistema do ParaBook' : comum.criador_nome ? `@${comum.criador_nome}` : <CriadorDesconhecido />}</td>
                  <td>{comum.total_membros || 0}</td>
                  <td>
                    {comum.criada_por_sistema ? (
                      <span className="admin-contador na">—</span>
                    ) : (
                      <span className={`admin-contador ${(comum.total_denuncias || 0) >= MIN_DENUNCIAS_EXCLUSAO ? 'no-limite' : ''}`}>
                        {comum.total_denuncias || 0}/{MIN_DENUNCIAS_EXCLUSAO}
                      </span>
                    )}
                  </td>
                  <td>
                    {comum.criada_por_sistema ? (
                      <span className="admin-origem oficial"><i className="fa-solid fa-shield-halved"></i> Oficial</span>
                    ) : (
                      <span className="admin-origem usuario"><i className="fa-solid fa-user-group"></i> Usuário</span>
                    )}
                  </td>
                  <td>
                    <button
                      className="admin-table-acao"
                      onClick={() => handleExcluir(comum)}
                      title={`Excluir ${comum.nome}`}
                      aria-label={`Excluir ${comum.nome}`}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-estado vazio">Nenhuma comunidade encontrada para este filtro.</p>
        )}
      </div>
    </section>
  );
}

export default AdminComunidades;
