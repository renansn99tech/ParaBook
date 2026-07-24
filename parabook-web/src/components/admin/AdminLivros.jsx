import { useState, useEffect } from 'react';
import api from '../../services/api';

function AdminLivros() {
  const [livros, setLivros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [guiaAberto, setGuiaAberto] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    titulo: '',
    categoria: '',
    autor: '',
    isbn: '',
    edicao: '',
    ano_publicacao: '',
    origem: 'dominio_publico'
  });
  const [capa, setCapa] = useState(null);
  const [pdf, setPdf] = useState(null);

  useEffect(() => {
    const fetchDados = async () => {
      try {
        const [resLivros, resCategorias] = await Promise.all([
          api.get('/biblioteca/livros/'),
          api.get('/biblioteca/categorias/')
        ]);
        setLivros(resLivros.data.results || resLivros.data);
        setCategorias(resCategorias.data.results || resCategorias.data);
      } catch (error) {
        console.error("Erro ao buscar dados", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDados();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    if (e.target.name === 'capa') setCapa(e.target.files[0]);
    if (e.target.name === 'pdf') setPdf(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    for (const key in formData) {
      data.append(key, formData[key]);
    }
    if (capa) data.append('capa', capa);
    if (pdf) data.append('pdf', pdf);

    try {
      const res = await api.post('/biblioteca/livros/', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLivros([res.data, ...livros]);
      setFormData({ titulo: '', categoria: '', autor: '', isbn: '', edicao: '', ano_publicacao: '', origem: 'dominio_publico' });
      setCapa(null);
      setPdf(null);
      alert('Livro adicionado com sucesso!');
    } catch (error) {
      console.error(error);
      alert('Erro ao adicionar livro.');
    }
  };

  return (
    <section className="secao" style={{ display: 'block' }}>
      <h1 style={{ color: 'white', marginBottom: '20px', textTransform: 'capitalize' }}>Gerenciar Livros</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <button 
          type="button"
          onClick={() => setGuiaAberto(!guiaAberto)}
          style={{
            background: 'rgba(139, 92, 246, 0.1)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            color: '#c4b5fd',
            padding: '10px 15px',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 'bold',
            transition: 'all 0.3s ease'
          }}
        >
          <i className="fa-solid fa-book-open"></i> Guia de Curadoria e Ferramentas 
          {guiaAberto ? <i className="fa-solid fa-chevron-up" style={{ marginLeft: 'auto' }}></i> : <i className="fa-solid fa-chevron-down" style={{ marginLeft: 'auto' }}></i>}
        </button>

        {guiaAberto && (
          <div style={{
            marginTop: '15px',
            padding: '20px',
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'rgba(255, 255, 255, 0.8)',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '20px'
          }}>
            <div>
              <h3 style={{ color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <i className="fa-solid fa-magnifying-glass" style={{ color: '#8b5cf6' }}></i> Busca de ISBN e Edição
              </h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                <li><a href="https://isbnsearch.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>ISBN Search</a> - Busca global de ISBN.</li>
                <li><a href="https://books.google.com/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>Google Books</a> - Ótimo para capas e edições antigas.</li>
              </ul>
            </div>

            <div>
              <h3 style={{ color: '#fff', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <i className="fa-solid fa-building-columns" style={{ color: '#8b5cf6' }}></i> Obras em Domínio Público
              </h3>
              <ul style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
                <li><a href="http://www.dominiopublico.gov.br/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>Portal Domínio Público (BR)</a></li>
                <li><a href="https://www.gutenberg.org/" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }}>Projeto Gutenberg</a></li>
              </ul>
            </div>

            <div style={{ gridColumn: '1 / -1', background: 'rgba(139, 92, 246, 0.1)', padding: '15px', borderRadius: '8px', borderLeft: '4px solid #8b5cf6', marginTop: '10px' }}>
              <p style={{ margin: 0, lineHeight: '1.6' }}><strong>Dica de Padronização:</strong> Certifique-se de preencher o "Ano de Publicação" com o ano da edição original ou da edição específica do arquivo PDF sendo anexado. Para capas, prefira imagens verticais de boa qualidade.</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="admin-form-container" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '30px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <input type="text" name="titulo" placeholder="Título" value={formData.titulo} onChange={handleChange} required className="admin-input" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white' }} />
          
          <select name="categoria" value={formData.categoria} onChange={handleChange} required className="admin-input" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white' }}>
            <option value="">Selecione Categoria</option>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
          
          <input type="text" name="autor" placeholder="Nome do Autor" value={formData.autor} onChange={handleChange} required className="admin-input" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white' }} />
          <input type="text" name="isbn" placeholder="ISBN (Ex: 978-3-16-148410-0)" value={formData.isbn} onChange={handleChange} className="admin-input" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white' }} />
          <input type="text" name="edicao" placeholder="Edição (Ex: 1ª Edição)" value={formData.edicao} onChange={handleChange} className="admin-input" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white' }} />
          <input type="number" name="ano_publicacao" placeholder="Ano de Publicação (Ex: 2026)" value={formData.ano_publicacao} onChange={handleChange} className="admin-input" style={{ padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white' }} />
          
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Capa (Imagem):</label>
            <input type="file" name="capa" onChange={handleFileChange} accept="image/*" className="admin-input" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white' }} />
          </div>
          <div>
            <label style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '5px', display: 'block' }}>Arquivo (PDF):</label>
            <input type="file" name="pdf" onChange={handleFileChange} accept="application/pdf" className="admin-input" style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white' }} />
          </div>
          
          <button type="submit" style={{ gridColumn: '1 / -1', background: '#8b5cf6', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }}>
            Adicionar
          </button>
        </form>
      </div>

      <div className="admin-list-container" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
        {loading ? (
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Carregando...</p>
        ) : livros.length > 0 ? (
          <table style={{ width: '100%', color: 'white', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
                <th style={{ padding: '10px 0' }}>Título</th>
                <th>Autor</th>
                <th>Categoria</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {livros.map(livro => (
                <tr key={livro.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '10px 0' }}>{livro.titulo}</td>
                  <td>{livro.autor}</td>
                  <td>{livro.categoria_nome || 'N/A'}</td>
                  <td>
                    <button style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><i className="fa-solid fa-trash"></i></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Nenhum livro cadastrado no banco de dados ainda.</p>
        )}
      </div>
    </section>
  );
}

export default AdminLivros;
