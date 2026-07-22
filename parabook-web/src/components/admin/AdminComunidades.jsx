import { useState, useEffect } from 'react';
import api from '../../services/api';

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
      const res = await api.post('/comunidades/', {
        ...formData,
        criada_por_sistema: true
      });
      setComunidades([res.data, ...comunidades]);
      setFormData({ nome: '', descricao: '' });
      alert('Comunidade oficial criada com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao criar comunidade oficial.');
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
                    {comum.criada_por_sistema ? 
                      <span style={{ color: '#4ade80', fontSize: '0.9rem' }}><i className="fa-solid fa-shield-halved"></i> Oficial</span> : 
                      <span style={{ color: '#60a5fa', fontSize: '0.9rem' }}><i className="fa-solid fa-user-group"></i> Usuário</span>
                    }
                  </td>
                  <td>
                    <button style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
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
