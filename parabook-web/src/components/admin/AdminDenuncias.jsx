import { useState, useEffect } from 'react';
import api from '../../services/api';

function AdminDenuncias() {
  const [dados, setDados] = useState({ livros: [], comunidades: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const res = await api.get('/dashboard/denuncias/');
        setDados(res.data);
      } catch (error) {
        console.error("Erro ao buscar denúncias", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, []);

  return (
    <section className="secao">
      <h1>Denúncias Recebidas</h1>
      <p className="admin-subtitulo">Moderação ativa de conteúdo violador de direitos autorais ou termos de uso.</p>

      <div className="admin-bloco">
        <h2 className="admin-bloco-titulo perigo">
          <i className="fa-solid fa-book-open"></i> Denúncias de Livros
        </h2>
        <div className="admin-panel">
          {loading ? (
            <p className="admin-estado">Carregando...</p>
          ) : dados.livros.length > 0 ? (
            <ul>
              {dados.livros.map(d => (
                <li key={d.id}>
                  <span>Livro: <strong>{d.livro}</strong> - Motivo: {d.motivo}</span>
                  <span className="admin-linha-meta">Por: @{d.denunciante} em {d.data}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-estado vazio">Nenhuma denúncia de livro pendente.</p>
          )}
        </div>
      </div>

      <div className="admin-bloco">
        <h2 className="admin-bloco-titulo aguardando">
          <i className="fa-solid fa-users-slash"></i> Denúncias de Comunidades
        </h2>
        <div className="admin-panel">
          {loading ? (
            <p className="admin-estado">Carregando...</p>
          ) : dados.comunidades.length > 0 ? (
            <ul>
              {dados.comunidades.map(c => (
                <li key={c.id}>
                  <span>Comunidade: <strong>{c.comunidade}</strong> - Motivo: {c.motivo}</span>
                  <span className="admin-linha-meta">Por: @{c.denunciante} em {c.data}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="admin-estado vazio">Nenhuma denúncia de comunidade no momento.</p>
          )}
        </div>
      </div>
    </section>
  );
}

export default AdminDenuncias;
