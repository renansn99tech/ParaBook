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
    <section className="secao">
      <h1>Gerenciar Livros</h1>

      <div className="admin-guia-bloco">
        <button
          type="button"
          className="admin-guia-toggle"
          onClick={() => setGuiaAberto(!guiaAberto)}
          aria-expanded={guiaAberto}
        >
          <i className="fa-solid fa-book-open"></i> Guia de Curadoria e Ferramentas
          <i className={`fa-solid chevron ${guiaAberto ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
        </button>

        {guiaAberto && (
          <div className="admin-guia">
            <div>
              <h3>
                <i className="fa-solid fa-magnifying-glass"></i> Busca de ISBN e Edição
              </h3>
              <ul>
                <li><a href="https://isbnsearch.org/" target="_blank" rel="noopener noreferrer">ISBN Search</a> - Busca global de ISBN.</li>
                <li><a href="https://books.google.com/" target="_blank" rel="noopener noreferrer">Google Books</a> - Ótimo para capas e edições antigas.</li>
              </ul>
            </div>

            <div>
              <h3>
                <i className="fa-solid fa-building-columns"></i> Obras em Domínio Público
              </h3>
              <ul>
                <li><a href="http://www.dominiopublico.gov.br/" target="_blank" rel="noopener noreferrer">Portal Domínio Público (BR)</a></li>
                <li><a href="https://www.gutenberg.org/" target="_blank" rel="noopener noreferrer">Projeto Gutenberg</a></li>
              </ul>
            </div>

            <div className="admin-guia-dica">
              <p><strong>Dica de Padronização:</strong> Certifique-se de preencher o &quot;Ano de Publicação&quot; com o ano da edição original ou da edição específica do arquivo PDF sendo anexado. Para capas, prefira imagens verticais de boa qualidade.</p>
            </div>
          </div>
        )}
      </div>

      <form className="form" onSubmit={handleSubmit}>
        <input type="text" name="titulo" placeholder="Título" value={formData.titulo} onChange={handleChange} required />

        <select name="categoria" value={formData.categoria} onChange={handleChange} required>
          <option value="">Selecione Categoria</option>
          {categorias.map(cat => (
            <option key={cat.id} value={cat.id}>{cat.nome}</option>
          ))}
        </select>

        <input type="text" name="autor" placeholder="Nome do Autor" value={formData.autor} onChange={handleChange} required />
        <input type="text" name="isbn" placeholder="ISBN (Ex: 978-3-16-148410-0)" value={formData.isbn} onChange={handleChange} />
        <input type="text" name="edicao" placeholder="Edição (Ex: 1ª Edição)" value={formData.edicao} onChange={handleChange} />
        <input type="number" name="ano_publicacao" placeholder="Ano de Publicação (Ex: 2026)" value={formData.ano_publicacao} onChange={handleChange} />

        <div className="campo-arquivo">
          <label htmlFor="admin-livro-capa">Capa (Imagem):</label>
          <input id="admin-livro-capa" type="file" name="capa" onChange={handleFileChange} accept="image/*" />
        </div>
        <div className="campo-arquivo">
          <label htmlFor="admin-livro-pdf">Arquivo (PDF):</label>
          <input id="admin-livro-pdf" type="file" name="pdf" onChange={handleFileChange} accept="application/pdf" />
        </div>

        <button type="submit" className="col-full">Adicionar</button>
      </form>

      <div className="admin-panel admin-list-container">
        {loading ? (
          <p className="admin-estado">Carregando...</p>
        ) : livros.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Autor</th>
                <th>Categoria</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {livros.map(livro => (
                <tr key={livro.id}>
                  <td>{livro.titulo}</td>
                  <td>{livro.autor}</td>
                  <td>{livro.categoria_nome || 'N/A'}</td>
                  <td>
                    <button className="admin-table-acao" aria-label={`Excluir ${livro.titulo}`}>
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="admin-estado">Nenhum livro cadastrado no banco de dados ainda.</p>
        )}
      </div>
    </section>
  );
}

export default AdminLivros;
