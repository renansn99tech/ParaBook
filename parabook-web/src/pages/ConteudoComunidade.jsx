import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import '../assets/css/conteudo-comunidade.css';

function ConteudoComunidade() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  
  const [comunidade, setComunidade] = useState(null);
  const [postagens, setPostagens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [busca, setBusca] = useState('');
  
  // Form state
  const [titulo, setTitulo] = useState('');
  const [conteudo, setConteudo] = useState('');

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const [comunidadeRes, postagensRes] = await Promise.all([
          api.get(`/comunidades/comunidades/${id}/`),
          api.get(`/comunidades/postagens/?comunidade=${id}`)
        ]);
        setComunidade(comunidadeRes.data);
        
        let pData = postagensRes.data.results || postagensRes.data;
        // Sort newest first
        pData.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em));
        setPostagens(pData);
      } catch (error) {
        console.error("Erro ao carregar conteúdo da comunidade", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const novaPostagem = {
        comunidade: id,
        titulo,
        conteudo,
      };
      const res = await api.post('/comunidades/postagens/', novaPostagem);
      setPostagens([res.data, ...postagens]);
      setTitulo('');
      setConteudo('');
      setShowForm(false);
    } catch (error) {
      console.error("Erro ao enviar postagem", error);
    }
  };

  const handleExcluir = async (postId) => {
    if (window.confirm("Apagar postagem? Essa ação não poderá ser desfeita.")) {
      try {
        await api.delete(`/comunidades/postagens/${postId}/`);
        setPostagens(postagens.filter(p => p.id !== postId));
      } catch (error) {
        console.error("Erro ao excluir", error);
      }
    }
  };

  const postsFiltrados = postagens.filter(p => 
    p.titulo.toLowerCase().includes(busca.toLowerCase()) || 
    p.conteudo.toLowerCase().includes(busca.toLowerCase())
  );

  if (loading) {
    return <div className="text-center text-white p-5 mt-5">Carregando...</div>;
  }

  if (!comunidade) {
    return <div className="text-center text-white p-5 mt-5">Comunidade não encontrada.</div>;
  }

  return (
    <main id="topo">
      <section className="banner-comunidade">
        <h2>{comunidade.nome}</h2>
        <p>{comunidade.descricao}</p>
      </section>

      <section className="posts-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '15px' }}>
          <h3 style={{ marginBottom: 0, color: 'white' }}>Postagens</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {comunidade.usuario_participa && (
              <button onClick={() => setShowForm(!showForm)} className="btn-primary-action">
                <i className={`fa-solid ${showForm ? 'fa-minus' : 'fa-plus'}`}></i> {showForm ? 'Cancelar' : 'Nova Postagem'}
              </button>
            )}
          </div>
        </div>

        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar posts..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>

        {showForm && (
          <section className="post-form-container" style={{ marginBottom: '30px' }}>
            <h3 style={{ color: 'white', marginBottom: '15px' }}>Adicionar postagem</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label style={{ color: '#94a3b8', marginBottom: '5px', display: 'block' }}>Título</label>
                <input
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: 'white' }}
                />
              </div>
              <div className="form-group mt-3">
                <label style={{ color: '#94a3b8', marginBottom: '5px', display: 'block' }}>Conteúdo</label>
                <textarea
                  required
                  rows="4"
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid rgba(255,255,255,0.2)', color: 'white', fontFamily: 'inherit' }}
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary mt-3 fw-bold px-4 py-2" style={{ borderRadius: '8px' }}>Publicar</button>
            </form>
          </section>
        )}

        <div id="lista-posts">
          {postsFiltrados.length > 0 ? (
            postsFiltrados.map(post => (
              <div className="post-card" key={post.id}>
                <div className="post-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div>
                    <h4 className="post-title" style={{ color: 'white', marginBottom: '5px' }}>{post.titulo}</h4>
                    <p className="post-author mb-3" style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: '#c4b5fd', fontWeight: '500' }}>@{post.autor_nome}</span>
                      <span className="post-date text-muted ms-2">• {new Date(post.criado_em).toLocaleDateString()}</span>
                    </p>
                  </div>
                  <div className="post-actions d-flex gap-2">
                    {user && user.id === post.autor && (
                      <button onClick={() => handleExcluir(post.id)} className="btn-danger-outline" style={{ padding: '8px 12px', fontSize: '0.85rem', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5' }} title="Remover postagem">
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    )}
                  </div>
                </div>
                <div className="post-content" style={{ color: '#e2e8f0', lineHeight: '1.6' }}>
                  {post.conteudo}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state text-center p-5" style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px dashed rgba(255,255,255,0.1)' }}>
              <i className="fas fa-comments fs-2 text-muted mb-3"></i>
              <p className="text-muted m-0">Nenhuma postagem encontrada.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ConteudoComunidade;
