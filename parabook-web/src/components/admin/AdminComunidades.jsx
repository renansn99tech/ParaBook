import { useState, useEffect } from 'react';
import swal from '../../services/swal';
import { useNavigate } from 'react-router-dom';
import { prepararPedidoConselho } from '../../services/pedidoConselho';
import api from '../../services/api';
import CriadorDesconhecido from '../CriadorDesconhecido';

// Contagem contextual de denúncias; não autoriza remoção nem substitui o Conselho.
const MIN_DENUNCIAS_EXCLUSAO = 10;

function AdminComunidades() {
  const navigate = useNavigate();
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
    if (await prepararPedidoConselho('comunidade', comunidade.id)) navigate('/dashboard?aba=operacao');
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
                      title={`Solicitar decisão do Conselho: ${comum.nome}`}
                      aria-label={`Solicitar decisão do Conselho: ${comum.nome}`}
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
