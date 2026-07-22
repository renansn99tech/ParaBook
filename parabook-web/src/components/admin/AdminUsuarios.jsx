import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

function AdminUsuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const res = await api.get('/dashboard/usuarios/');
        setUsuarios(res.data);
      } catch (error) {
        console.error("Erro ao buscar usuários", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, []);

  return (
    <section className="secao" style={{ display: 'block' }}>
      <h1 style={{ color: 'white', marginBottom: '10px' }}>Gerenciar Usuários</h1>
      <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '30px' }}>Lista de usuários cadastrados no ParaBook:</p>
      
      <div className="admin-list-container">
        {loading ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Carregando...</p>
        ) : usuarios.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {usuarios.map(u => (
              <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0f172a', padding: '15px 20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  {u.foto ? (
                    <img src={u.foto} alt={`Foto de ${u.username}`} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                      <i className="fa-solid fa-user"></i>
                    </div>
                  )}
                  <strong style={{ color: 'white', fontSize: '1.1rem' }}>
                    <Link to={`/perfil/${u.username}`} style={{ color: 'inherit', textDecoration: 'none' }} className="hover-link">
                      {u.is_superuser ? 'Super User' : 'Usuário'} (@{u.username})
                    </Link>
                  </strong>
                </div>
                
                <div>
                  {u.is_superuser && (
                    <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                      Admin
                    </span>
                  )}
                  {u.is_staff && !u.is_superuser && (
                    <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', padding: '4px 10px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                      Staff
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Nenhum usuário encontrado.</p>
        )}
      </div>
    </section>
  );
}

export default AdminUsuarios;
