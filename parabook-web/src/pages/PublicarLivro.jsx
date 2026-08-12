import { useContext, useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import swal from '../services/swal';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/obras-autores.css';

// Campos opcionais: se vazios, são removidos do envio para a API aplicar seus defaults
// em vez de gravar string vazia (evita colidir com a unicidade do ISBN, por exemplo).
const CAMPOS_OPCIONAIS = ['isbn', 'edicao', 'paginas', 'ano_publicacao', 'registro_autoral', 'numero_registro'];

function PublicarLivro() {
  const { user, loading } = useContext(AuthContext);
  const navigate = useNavigate();

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

  const [categorias, setCategorias] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const paginaRef = useRevelacao([loading, user]);

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        nome: user.nome || user.username || '',
        email: user.email || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    api.get('/biblioteca/categorias/')
      .then(res => setCategorias(res.data))
      .catch(err => console.error("Erro ao carregar categorias:", err));
  }, []);

  if (loading) {
    return <div className="text-center mt-5"><h2 style={{ color: 'var(--text)' }}>Carregando...</h2></div>;
  }

  // Verifica se está logado e se tem permissão (autor ou admin)
  const isAuthorized = user && (user.tipo === 'autor' || user.tipo === 'admin');

  if (!isAuthorized) {
    return (
      <div className="publicar-container" ref={paginaRef} style={{ paddingTop: '100px' }}>
        <div className="form-box text-center" data-revelar style={{ maxWidth: '500px', padding: '40px' }}>
          <i className="fa-solid fa-lock mb-3" style={{ fontSize: '3rem', color: '#f87171' }}></i>
          <h2 style={{ color: 'var(--text)', marginBottom: '15px' }}>Acesso Restrito</h2>
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);

    const dadosFormulario = new FormData(e.target);
    CAMPOS_OPCIONAIS.forEach((campo) => {
      if (!dadosFormulario.get(campo)) {
        dadosFormulario.delete(campo);
      }
    });

    try {
      await api.post('/biblioteca/solicitacoes-publicacao/', dadosFormulario, {
        // Content-Type precisa ficar a cargo do navegador (define o boundary do multipart);
        // a instância `api` tem 'application/json' como default e sobrescreveria isso.
        headers: { 'Content-Type': undefined }
      });

      await swal.fire({
        icon: 'success',
        title: 'Obra enviada!',
        text: 'Sua obra foi enviada com sucesso para análise de publicação.'
      });
      navigate('/biblioteca');
    } catch (error) {
      console.error("Erro ao enviar obra", error);

      const data = error.response?.data;
      let mensagem = 'Não foi possível enviar sua obra. Tente novamente em instantes.';
      if (data) {
        const mensagens = Object.values(data).flat();
        if (mensagens.length > 0) {
          mensagem = mensagens.join(' ');
        }
      }

      swal.fire({
        icon: 'error',
        title: 'Erro ao enviar obra',
        text: mensagem});
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="publicar-container" ref={paginaRef} style={{ paddingTop: '100px', paddingBottom: '40px' }}>
      <div className="form-box" data-revelar>
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
                <input type="text" id="nome" name="nome" value={formData.nome} onChange={handleInputChange} readOnly />
              </div>
            </div>
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="email">E-mail</label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} readOnly />
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-4">
              <div className="form-group">
                <label htmlFor="cpf_autor">CPF</label>
                <input type="text" id="cpf_autor" name="cpf_autor" value={formData.cpf_autor} onChange={handleInputChange} required />
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
            <input type="text" id="titulo" name="titulo" value={formData.titulo} onChange={handleInputChange} required />
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="form-group">
                <label htmlFor="categoria">Categoria</label>
                <select id="categoria" name="categoria" value={formData.categoria} onChange={handleInputChange} required>
                  <option value="">Selecione uma categoria...</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nome}</option>
                  ))}
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
                <input type="text" id="isbn" name="isbn" value={formData.isbn} onChange={handleInputChange} placeholder="Opcional" />
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
                <input type="file" id="pdf" name="pdf" accept=".pdf" required />
                <small style={{ color: '#94a3b8' }}>Tamanho máximo: 5MB.</small>
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
              value="true"
              checked={formData.declaracao_autoria}
              onChange={handleInputChange}
              required
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
              value="true"
              checked={formData.aceitou_termos}
              onChange={handleInputChange}
              required
            />
            <label htmlFor="aceitou_termos">
              Li e aceito os termos de uso, autorizando a plataforma a disponibilizar minha obra para leitura digital gratuita dos usuários.
            </label>
          </div>

          <div className="d-flex flex-column gap-3 mt-4">
            <button type="submit" className="submit-btn" disabled={enviando}>
              {enviando ? 'Enviando...' : 'Enviar Obra para Moderação'}
            </button>
            <Link to="/biblioteca" className="btn-ghost">
              Voltar para a Biblioteca
            </Link>
          </div>

        </form>
      </div>
    </div>
  );
}

export default PublicarLivro;
