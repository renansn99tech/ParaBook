import { useState, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Swal from 'sweetalert2';
import '../assets/css/livro-info.css';

function LivroInfo() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);

  const [livro, setLivro] = useState(null);
  const [avaliacoes, setAvaliacoes] = useState([]);
  const [minhaAvaliacao, setMinhaAvaliacao] = useState(null);
  const [notaForm, setNotaForm] = useState('');
  const [resenhaForm, setResenhaForm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLivroInfo = async () => {
      try {
        const resLivro = await api.get(`/biblioteca/livros/${id}/`);
        setLivro(resLivro.data);

        const resResenhas = await api.get(`/biblioteca/livros/${id}/resenhas/`);
        setAvaliacoes(resResenhas.data);

        if (user) {
          const resEstante = await api.get(`/biblioteca/estante/`);
          const estanteData = resEstante.data.results || resEstante.data;
          const userEntry = estanteData.find(item => item.livro === parseInt(id));
          if (userEntry && userEntry.nota) {
            setMinhaAvaliacao(userEntry);
          }
        }
      } catch (error) {
        console.error("Erro ao buscar detalhes do livro", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLivroInfo();
  }, [id, user]);

  const abrirDenuncia = () => {
    Swal.fire({
      title: "Relatar Problema",
      text: `Selecione o motivo da denúncia para a obra "${livro?.titulo}":`,
      input: "select",
      inputOptions: {
        Pirataria: "Violação de Direitos Autorais",
        Plagio: "Plágio / Cópia Ilegal",
        Ofensivo: "Conteúdo Ofensivo / Ilegal",
        Erro: "Arquivo corrompido / Outro erro",
      },
      inputPlaceholder: "Selecione um motivo...",
      showCancelButton: true,
      confirmButtonText: "Enviar Denúncia",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#374151",
      background: "#0f172a",
      color: "#f8fafc",
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (value) {
            resolve();
          } else {
            resolve("Você precisa selecionar um motivo.");
          }
        });
      },
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: "Denúncia Recebida!",
          text: "Nossa equipe de moderação analisará o caso em até 48 horas.",
          icon: "success",
          background: "#0f172a",
          color: "#f8fafc",
          confirmButtonColor: "#8b5cf6",
        });
      }
    });
  };

  const confirmarRemocaoAvaliacao = () => {
    Swal.fire({
      title: "Remover Avaliação?",
      text: "Tem certeza de que deseja apagar sua nota e comentário desta obra?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#374151",
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
      background: "#0f172a",
      color: "#f8fafc",
    }).then(async (result) => {
      if (result.isConfirmed && minhaAvaliacao?.id) {
        try {
          await api.patch(`/biblioteca/estante/${minhaAvaliacao.id}/`, { nota: null, resenha: null });
          Swal.fire('Removido', 'Sua avaliação foi removida.', 'success');
          setMinhaAvaliacao(null);
          const resResenhas = await api.get(`/biblioteca/livros/${id}/resenhas/`);
          setAvaliacoes(resResenhas.data);
        } catch (error) {
          console.error("Erro ao remover avaliação", error);
        }
      }
    });
  };

  const handleAvaliar = async (e) => {
    e.preventDefault();
    try {
      if (minhaAvaliacao?.id) {
        await api.patch(`/biblioteca/estante/${minhaAvaliacao.id}/`, { 
          nota: parseInt(notaForm), resenha: resenhaForm 
        });
      } else {
        await api.post(`/biblioteca/estante/`, {
          livro: parseInt(id),
          nota: parseInt(notaForm),
          resenha: resenhaForm,
          status: 'lido'
        });
      }
      
      Swal.fire('Sucesso!', 'Avaliação salva com sucesso.', 'success');
      
      const resEstante = await api.get(`/biblioteca/estante/`);
      const estanteData = resEstante.data.results || resEstante.data;
      const userEntry = estanteData.find(item => item.livro === parseInt(id));
      setMinhaAvaliacao(userEntry);
      
      const resResenhas = await api.get(`/biblioteca/livros/${id}/resenhas/`);
      setAvaliacoes(resResenhas.data);
      
      setNotaForm('');
      setResenhaForm('');
    } catch (error) {
      console.error("Erro ao salvar avaliação", error);
    }
  };

  if (loading) {
    return (
      <div className="container py-4 text-center mt-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Carregando...</span>
        </div>
      </div>
    );
  }

  if (!livro) {
    return (
      <div className="container py-4 text-center mt-5">
        <h2 className="text-white">Livro não encontrado</h2>
      </div>
    );
  }

  return (
    <main className="container livro-info-page">
      <section className="livro-info-container glass-card">
        <div className="livro-capa-col">
          {livro.capa_url ? (
            <img src={livro.capa_url} alt={livro.titulo} className="livro-capa-img" />
          ) : (
            <div className="livro-capa-placeholder">
              <i className="fa-solid fa-book" style={{ fontSize: '5rem', color: '#475569' }}></i>
            </div>
          )}

          <Link to={`/leitura/${livro.id}`} className="btn-preview">
            <i className="fa-solid fa-book-open-reader"></i> Ver Prévia
          </Link>
        </div>

        <div className="livro-dados-col">
          <div className="livro-header">
            <div>
              <h1 className="livro-titulo">{livro.titulo}</h1>
              <p className="autor-destaque">
                <i className="fa-solid fa-pen-nib"></i> {livro.autor}
              </p>
            </div>
            <button onClick={abrirDenuncia} className="btn-denuncia">
              <i className="fa-solid fa-flag"></i> Relatar Problema
            </button>
          </div>

          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="meta-titulo">Gênero / Categoria</span>
              <span className="meta-valor">
                <i className="fa-solid fa-bookmark" style={{ color: '#8b5cf6' }}></i> {livro.categoria_nome || "Não informado"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="meta-titulo">Ano / Data de Publicação</span>
              <span className="meta-valor">
                <i className="fa-regular fa-calendar-days" style={{ color: '#8b5cf6' }}></i> {livro.ano_publicacao || "Não informado"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="meta-titulo">ISBN</span>
              <span className="meta-valor">
                <i className="fa-solid fa-barcode" style={{ color: '#8b5cf6' }}></i> {livro.isbn || "Não cadastrado"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="meta-titulo">Edição / Organização</span>
              <span className="meta-valor">
                <i className="fa-solid fa-layer-group" style={{ color: '#8b5cf6' }}></i> {livro.edicao || "1ª Edição"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="meta-titulo">Páginas (Aprox.)</span>
              <span className="meta-valor">
                <i className="fa-solid fa-file-lines" style={{ color: '#8b5cf6' }}></i> {livro.paginas || "---"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="meta-titulo">Avaliação Média</span>
              <span className="meta-valor">
                <i className="fa-solid fa-star" style={{ color: '#fbbf24' }}></i> {livro.avaliacao || "S/N"} / 5
              </span>
            </div>
          </div>

          <h3 className="sinopse-titulo">Sinopse / Descrição</h3>
          <p className="sinopse-texto">
            {livro.sinopse || "Nenhuma sinopse disponível."}
          </p>
        </div>
      </section>

      <section className="avaliacoes-section">
        <h2 className="avaliacoes-titulo">
          <i className="fa-solid fa-comments" style={{ color: '#8b5cf6' }}></i> Avaliações da Comunidade
        </h2>

        {user && (
          <div className="minha-avaliacao-card glass-card">
            {minhaAvaliacao ? (
              <div className="minha-avaliacao-header">
                <div>
                  <h4 style={{ color: '#c4b5fd', marginBottom: '10px' }}>Sua Avaliação</h4>
                  <div style={{ color: '#fbbf24', marginBottom: '10px', fontSize: '1.2rem' }}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i key={star} className={`fa-${star <= minhaAvaliacao.nota ? 'solid' : 'regular'} fa-star`}></i>
                    ))}
                  </div>
                  <p style={{ color: '#cbd5e1', fontStyle: 'italic', margin: 0 }}>
                    "{minhaAvaliacao.resenha}"
                  </p>
                </div>
                <button
                  type="button"
                  className="btn-denuncia"
                  onClick={confirmarRemocaoAvaliacao}
                >
                  <i className="fa-solid fa-trash"></i> Remover
                </button>
              </div>
            ) : (
              <>
                <h4 style={{ color: 'white', marginBottom: '20px' }}>O que você achou desta obra?</h4>
                <form onSubmit={handleAvaliar} className="form-avaliacao">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                    <label style={{ color: '#cbd5e1', fontWeight: 'bold' }}>Sua Nota:</label>
                    <select
                      required
                      className="form-avaliacao-select"
                      value={notaForm}
                      onChange={(e) => setNotaForm(e.target.value)}
                    >
                      <option value="" disabled>Escolha de 1 a 5 estrelas...</option>
                      <option value="5">⭐⭐⭐⭐⭐ (5/5) - Excelente, obra-prima</option>
                      <option value="4">⭐⭐⭐⭐ (4/5) - Muito Bom</option>
                      <option value="3">⭐⭐⭐ (3/5) - Bom</option>
                      <option value="2">⭐⭐ (2/5) - Regular</option>
                      <option value="1">⭐ (1/5) - Ruim</option>
                    </select>
                  </div>
                  <textarea
                    maxLength="240"
                    required
                    placeholder="Escreva um breve comentário (máximo 240 caracteres)..."
                    className="form-avaliacao-textarea"
                    value={resenhaForm}
                    onChange={(e) => setResenhaForm(e.target.value)}
                  ></textarea>

                  <button type="submit" className="btn-avaliar">
                    <i className="fa-solid fa-paper-plane"></i> Publicar Avaliação
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        <div className="avaliacoes-grid">
          {avaliacoes.length > 0 ? (
            avaliacoes.map((ava) => (
              <div key={ava.id} className="avaliacao-card glass-card">
                <div className="avaliacao-header">
                  <strong className="avaliacao-user">
                    {ava.usuario_foto ? (
                      <img src={ava.usuario_foto} alt="User Avatar" style={{ width: '24px', height: '24px', borderRadius: '50%', marginRight: '5px', verticalAlign: 'middle', objectFit: 'cover' }} />
                    ) : (
                      <i className="fa-solid fa-user-circle" style={{ color: '#94a3b8', fontSize: '1.2rem', verticalAlign: 'middle', marginRight: '5px' }}></i>
                    )}
                    @{ava.usuario_nome}
                  </strong>
                  <span className="avaliacao-nota">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i key={star} className={`fa-${star <= ava.nota ? 'solid' : 'regular'} fa-star`}></i>
                    ))}
                  </span>
                </div>
                <p className="avaliacao-texto">"{ava.resenha}"</p>
                <small className="avaliacao-data">{new Date(ava.data_adicao).toLocaleDateString('pt-BR')}</small>
              </div>
            ))
          ) : (
            <div className="empty-avaliacoes">
              <i className="fa-solid fa-star-half-stroke" style={{ fontSize: '2.5rem', color: '#475569', marginBottom: '15px' }}></i>
              <p style={{ color: '#64748b', fontSize: '1.1rem', margin: 0 }}>
                Nenhuma avaliação para esta obra ainda. Seja o primeiro a avaliar!
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default LivroInfo;
