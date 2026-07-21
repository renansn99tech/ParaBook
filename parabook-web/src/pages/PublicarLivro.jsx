import { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import '../assets/css/obras-autores.css';

function PublicarLivro() {
  const { user, loading } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    cpf_autor: '',
    registro_autoral: '',
    numero_registro: '',
    titulo: '',
    categoria: '',
    paginas: '',
    ano_publicacao: '',
    isbn: '',
    edicao: '',
    declaracao_autoria: false,
    aceitou_termos: false
  });

  if (loading) {
    return <div className="text-center mt-5"><h2 style={{ color: 'white' }}>Carregando...</h2></div>;
  }

  // Verifica se está logado e se tem permissão (is_staff ou status == 'aprovado')
  const isAuthorized = user && (user.is_staff || (user.perfil && user.perfil.status === 'aprovado'));

  if (!isAuthorized) {
    return (
      <div className="form-container" style={{ paddingTop: '100px' }}>
        <div className="form-box text-center" style={{ maxWidth: '500px', padding: '40px' }}>
          <i className="fa-solid fa-lock mb-3" style={{ fontSize: '3rem', color: '#f87171' }}></i>
          <h2 style={{ color: 'white', marginBottom: '15px' }}>Acesso Restrito</h2>
          <p style={{ color: '#94a3b8', marginBottom: '30px' }}>
            Esta página é exclusiva para Autores Independentes aprovados e Administradores do ParaBook.
          </p>
          <Link to="/perfil" className="submit-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
            Ir para Meu Perfil
          </Link>
        </div>
      </div>
    );
  }

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // A integração com a API (incluindo envio de arquivos Multipart) 
    // será feita na fase final de testes.
    console.log("Formulário submetido para testes futuros", formData);
  };

  return (
    <div className="form-container" style={{ paddingTop: '100px', paddingBottom: '40px' }}>
      <div className="form-box">
        <h1>Enviar Nova Obra</h1>
        <p>Preencha os dados abaixo para enviar seu manuscrito para análise de publicação.</p>

        <form onSubmit={handleSubmit} noValidate>
          <h4 className="mb-3" style={{ color: 'var(--purple, #8b5cf6)', borderBottom: '1px solid rgba(139,92,246,.25)', paddingBottom: '8px' }}>
            1. Identificação do Autor
          </h4>
          
          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="nome">Nome do Autor</label>
                <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleInputChange} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-4">
              <div className="form-group">
                <label htmlFor="cpf_autor">CPF</label>
                <input type="text" id="cpf_autor" name="cpf_autor" value={formData.cpf_autor} onChange={handleInputChange} />
              </div>
            </div>
            <div className="col-md-4">
              <div className="form-group">
                <label htmlFor="registro_autoral">Registro Autoral (Opcional)</label>
                <input type="text" id="registro_autoral" name="registro_autoral" value={formData.registro_autoral} onChange={handleInputChange} />
              </div>
            </div>
            <div className="col-md-4">
              <div className="form-group">
                <label htmlFor="numero_registro">Nº Registro (Opcional)</label>
                <input type="text" id="numero_registro" name="numero_registro" value={formData.numero_registro} onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <h4 className="mb-3" style={{ color: 'var(--purple, #8b5cf6)', borderBottom: '1px solid rgba(139,92,246,.25)', paddingBottom: '8px', marginTop: '20px' }}>
            2. Informações da Obra
          </h4>

          <div className="form-group">
            <label htmlFor="titulo">Título do Livro</label>
            <input type="text" id="titulo" name="titulo" value={formData.titulo} onChange={handleInputChange} />
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="categoria">Categoria</label>
                <select id="categoria" name="categoria" value={formData.categoria} onChange={handleInputChange}>
                  <option value="">Selecione uma categoria...</option>
                  <option value="ficcao">Ficção</option>
                  <option value="romance">Romance</option>
                  <option value="fantasia">Fantasia</option>
                  <option value="terror">Terror / Suspense</option>
                  <option value="sci-fi">Ficção Científica</option>
                  <option value="tecnico">Técnico / Acadêmico</option>
                </select>
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label htmlFor="paginas">Nº de Páginas</label>
                <input type="number" id="paginas" name="paginas" value={formData.paginas} onChange={handleInputChange} />
              </div>
            </div>
            <div className="col-md-3">
              <div className="form-group">
                <label htmlFor="ano_publicacao">Ano</label>
                <input type="number" id="ano_publicacao" name="ano_publicacao" value={formData.ano_publicacao} onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="isbn">ISBN</label>
                <input type="text" id="isbn" name="isbn" value={formData.isbn} onChange={handleInputChange} />
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="edicao">Edição</label>
                <input type="text" id="edicao" name="edicao" value={formData.edicao} onChange={handleInputChange} />
              </div>
            </div>
          </div>

          <h4 className="mb-3" style={{ color: 'var(--purple, #8b5cf6)', borderBottom: '1px solid rgba(139,92,246,.25)', paddingBottom: '8px', marginTop: '20px' }}>
            3. Upload de Arquivos
          </h4>

          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="capa">Capa do Livro (Imagem)</label>
                <input type="file" id="capa" name="capa" accept="image/*" />
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="pdf">Arquivo PDF da Obra</label>
                <input type="file" id="pdf" name="pdf" accept=".pdf" />
              </div>
            </div>
          </div>

          <h4 className="mb-3" style={{ color: 'var(--purple, #8b5cf6)', borderBottom: '1px solid rgba(139,92,246,.25)', paddingBottom: '8px', marginTop: '20px' }}>
            4. Termos e Declarações
          </h4>

          <div className="form-group checkbox">
            <input 
              type="checkbox" 
              id="declaracao_autoria" 
              name="declaracao_autoria" 
              checked={formData.declaracao_autoria} 
              onChange={handleInputChange} 
              className="form-check-input"
            />
            <label htmlFor="declaracao_autoria">
              Declaro que sou o legítimo autor da obra intelectual enviada e assumo total responsabilidade civil e penal pelo seu conteúdo.
            </label>
          </div>

          <div className="form-group checkbox mb-4">
            <input 
              type="checkbox" 
              id="aceitou_termos" 
              name="aceitou_termos" 
              checked={formData.aceitou_termos} 
              onChange={handleInputChange} 
              className="form-check-input"
            />
            <label htmlFor="aceitou_termos">
              Li e aceito os termos de uso, autorizando a plataforma a disponibilizar minha obra para leitura digital gratuita dos usuários.
            </label>
          </div>

          <div className="d-flex flex-column gap-3 mt-4">
            <button type="submit" className="submit-btn">Enviar Obra para Moderação</button>
            <Link to="/biblioteca" className="btn btn-outline-light py-3" style={{ borderRadius: '16px', textAlign: 'center' }}>
              Voltar para a Biblioteca
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}

export default PublicarLivro;
