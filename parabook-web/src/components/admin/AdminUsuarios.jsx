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
    <section className="secao">
      <h1>Gerenciar Usuários</h1>
      <p className="admin-subtitulo">Lista de usuários cadastrados no ParaBook:</p>

      <div className="admin-panel admin-list-container">
        {loading ? (
          <p className="admin-estado">Carregando...</p>
        ) : usuarios.length > 0 ? (
          <ul>
            {usuarios.map(u => (
              <li key={u.id}>
                <div className="admin-usuario-info">
                  {u.foto ? (
                    <img className="admin-avatar" src={u.foto} alt={`Foto de ${u.username}`} loading="lazy" decoding="async" width="44" height="44" />
                  ) : (
                    <div className="admin-avatar sem-foto" aria-hidden="true">
                      <i className="fa-solid fa-user"></i>
                    </div>
                  )}
                  <strong>
                    <Link to={`/perfil/${u.username}`} className="hover-link">
                      {u.is_superuser ? 'Super User' : 'Usuário'} (@{u.username})
                    </Link>
                  </strong>
                </div>

                <div>
                  {u.is_superuser && <span className="admin-pill super">Admin</span>}
                  {u.is_staff && !u.is_superuser && <span className="admin-pill staff">Staff</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="admin-estado vazio">Nenhum usuário encontrado.</p>
        )}
      </div>
    </section>
  );
}

export default AdminUsuarios;
