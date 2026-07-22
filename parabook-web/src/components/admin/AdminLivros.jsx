import { useState, useEffect } from 'react';
import api from '../../services/api';

function AdminLivros() {
  const [livros, setLivros] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [loading, setLoading] = useState(true);

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
      
      <div className="admin-form-container" style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: '30px' }}>
        <input 
          type="text" 
          placeholder="Buscar livro..." 
          className="admin-input-full" 
          style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)', background: '#0f172a', color: 'white', marginBottom: '20px' }} 
        />
        
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
