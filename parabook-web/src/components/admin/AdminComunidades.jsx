import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import api from '../../services/api';

const swalTema = {
  background: '#1e293b',
  color: '#fff',
  confirmButtonColor: '#8b5cf6'
};

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
      Swal.fire({
        icon: 'success',
        title: 'Comunidade oficial criada!',
        text: `"${res.data.nome}" já está disponível para os leitores.`,
        ...swalTema
      });
    } catch (error) {
      console.error("Erro ao criar comunidade oficial", error);
      const dados = error.response?.data;
      const mensagem = dados?.detail
        || Object.values(dados || {}).flat()[0]
        || 'Não foi possível criar a comunidade oficial.';

      Swal.fire({ icon: 'error', title: 'Ops', text: mensagem, ...swalTema });
    }
  };

  const handleExcluir = async (comunidade) => {
    // Sala oficial é da casa: basta a confirmação do admin.
    if (comunidade.criada_por_sistema) {
      const confirmacao = await Swal.fire({
        ...swalTema,
        icon: 'warning',
        title: 'Excluir comunidade oficial?',
        html: `<strong>${comunidade.nome}</strong> e todas as suas postagens serão removidas. Esta ação não pode ser desfeita.`,
        showCancelButton: true,
        confirmButtonText: 'Sim, excluir',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ef4444'
      });

      if (!confirmacao.isConfirmed) return;
      await executarExclusao(comunidade);
      return;
    }

    // Sala de usuário exige lastro de denúncias: mostramos o placar antes.
    const denuncias = comunidade.total_denuncias || 0;
    const faltam = MIN_DENUNCIAS_EXCLUSAO - denuncias;
    const atingiuMinimo = faltam <= 0;

    const confirmacao = await Swal.fire({
      ...swalTema,
      icon: atingiuMinimo ? 'warning' : 'info',
      title: atingiuMinimo ? 'Excluir comunidade denunciada?' : 'Denúncias insuficientes',
      html: `
        <p style="margin-bottom:14px"><strong>${comunidade.nome}</strong> — criada por @${comunidade.criador_nome || 'desconhecido'}</p>
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
      confirmButtonColor: atingiuMinimo ? '#ef4444' : '#8b5cf6'
    });

    if (atingiuMinimo && confirmacao.isConfirmed) {
      await executarExclusao(comunidade);
    }
  };

  const executarExclusao = async (comunidade) => {
    try {
      await api.delete(`/comunidades/comunidades/${comunidade.id}/`);
      setComunidades(comunidades.filter(c => c.id !== comunidade.id));
      Swal.fire({
        ...swalTema,
        icon: 'success',
        title: 'Comunidade excluída',
        text: `"${comunidade.nome}" foi removida da plataforma.`
      });
    } catch (error) {
      console.error("Erro ao excluir comunidade", error);
      Swal.fire({
        ...swalTema,
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
    <section className="secao" style={{ display: 'block' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <h1 style={{ color: 'white', marginBottom: '5px' }}>Gerenciar Comunidades</h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Controle de ecossistemas literários e moderação de salas.</p>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input 
            type="text" 
            name="nome" 
            placeholder="Nome da Comunidade Oficial" 
            value={formData.nome} 
            onChange={handleChange} 
            required 
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white', height: '45px' }} 
          />
          <input 
            type="text" 
            name="descricao" 
            placeholder="Descrição Curta" 
            value={formData.descricao} 
            onChange={handleChange} 
            required 
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white', height: '45px' }} 
          />
          <button type="submit" style={{ background: '#8b5cf6', color: 'white', padding: '0 25px', height: '45px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap' }}>
            + Criar Oficial
          </button>
        </form>
      </div>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setFiltro('todas')}
          style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: filtro === 'todas' ? '#6b21a8' : '#1e293b', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Todas ({comunidades.length})
        </button>
        <button 
          onClick={() => setFiltro('sistema')}
          style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: filtro === 'sistema' ? '#166534' : '#1e293b', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Do Sistema ({totalSistema})
        </button>
        <button 
          onClick={() => setFiltro('usuarios')}
          style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: filtro === 'usuarios' ? '#1e40af' : '#1e293b', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
        >
          Dos Usuários ({totalUsuarios})
        </button>
      </div>

      <div className="admin-list-container" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {loading ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Carregando...</p>
        ) : filtradas.length > 0 ? (
          <table style={{ width: '100%', color: 'white', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '10px 0' }}>Nome</th>
                <th>Criador</th>
                <th>Membros</th>
                <th>Denúncias</th>
                <th>Tipo</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map(comum => (
                <tr key={comum.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '10px 0' }}>{comum.nome}</td>
                  <td>{comum.criador_nome || 'Sistema'}</td>
                  <td>{comum.total_membros || 0}</td>
                  <td>
                    {comum.criada_por_sistema ? (
                      <span style={{ color: '#64748b' }}>—</span>
                    ) : (
                      <span style={{ color: (comum.total_denuncias || 0) >= MIN_DENUNCIAS_EXCLUSAO ? '#ef4444' : '#94a3b8', fontWeight: (comum.total_denuncias || 0) >= MIN_DENUNCIAS_EXCLUSAO ? 'bold' : 'normal' }}>
                        {comum.total_denuncias || 0}/{MIN_DENUNCIAS_EXCLUSAO}
                      </span>
                    )}
                  </td>
                  <td>
                    {comum.criada_por_sistema ?
                      <span style={{ color: '#4ade80', fontSize: '0.9rem' }}><i className="fa-solid fa-shield-halved"></i> Oficial</span> : 
                      <span style={{ color: '#60a5fa', fontSize: '0.9rem' }}><i className="fa-solid fa-user-group"></i> Usuário</span>
                    }
                  </td>
                  <td>
                    <button
                      onClick={() => handleExcluir(comum)}
                      title={`Excluir ${comum.nome}`}
                      aria-label={`Excluir ${comum.nome}`}
                      style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Nenhuma comunidade encontrada para este filtro.</p>
        )}
      </div>
    </section>
  );
}

export default AdminComunidades;
