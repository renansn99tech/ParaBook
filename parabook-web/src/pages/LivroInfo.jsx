import { useState, useEffect, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import swal, { BOTAO } from '../services/swal';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';
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
  const paginaRef = useRevelacao([livro, avaliacoes, minhaAvaliacao, loading]);

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
    swal.fire({
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
      confirmButtonColor: BOTAO.perigo,
      cancelButtonColor: BOTAO.neutro,
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
        swal.fire({
          title: "Denúncia Recebida!",
          text: "Nossa equipe de moderação analisará o caso em até 48 horas.",
          icon: "success",
          background: "#0f172a",
          color: "#f8fafc",
        });
      }
    });
  };

  const confirmarRemocaoAvaliacao = () => {
    swal.fire({
      title: "Remover Avaliação?",
      text: "Tem certeza de que deseja apagar sua nota e comentário desta obra?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: BOTAO.perigo,
      cancelButtonColor: BOTAO.neutro,
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
      background: "#0f172a",
      color: "#f8fafc",
    }).then(async (result) => {
      if (result.isConfirmed && minhaAvaliacao?.id) {
        try {
          await api.patch(`/biblioteca/estante/${minhaAvaliacao.id}/`, { nota: null, resenha: null });
          swal.fire('Removido', 'Sua avaliação foi removida.', 'success');
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
      
      swal.fire('Sucesso!', 'Avaliação salva com sucesso.', 'success');
      
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

  const acesso = livro.acesso || {};
  let acaoLeitura;
  if (acesso.pode_ler) {
    acaoLeitura = { to: `/leitura/${livro.id}`, icone: 'fa-book-open-reader', texto: 'Ler obra' };
  } else if (acesso.pode_ler_amostra) {
    acaoLeitura = { to: `/leitura/${livro.id}?amostra=1`, icone: 'fa-book-open', texto: 'Ler amostra' };
  } else if (acesso.requer_assinatura) {
    acaoLeitura = { to: '/planos', icone: 'fa-gem', texto: 'Conhecer planos' };
  } else if (acesso.codigo === 'requer_autenticacao') {
    acaoLeitura = { to: '/login', icone: 'fa-right-to-bracket', texto: 'Entrar para ler' };
  }

  return (
    <main className="container livro-info-page" ref={paginaRef}>
      <section className="livro-info-container glass-card" data-revelar>
        <div className="livro-capa-col">
          {livro.capa_url ? (
            <img
              src={livro.capa_url}
              alt={`Capa do livro ${livro.titulo}`}
              className="livro-capa-img"
              decoding="async"
              fetchPriority="high"
              width="300"
              height="420"
            />
          ) : (
            <div className="livro-capa-placeholder capa-vazia">
              <i className="fa-solid fa-book"></i>
            </div>
          )}

          {acaoLeitura ? (
            <Link to={acaoLeitura.to} className="btn-preview">
              <i className={`fa-solid ${acaoLeitura.icone}`}></i> {acaoLeitura.texto}
            </Link>
          ) : (
            <p className="livro-acesso-indisponivel" role="status">{acesso.mensagem || 'Obra indisponível.'}</p>
          )}
        </div>

        <div className="livro-dados-col">
          <div className="livro-header">
            <div>
              <h1 className="livro-titulo">{livro.titulo}</h1>
              <p className="autor-destaque">
                <i className="fa-solid fa-pen-nib"></i> {livro.autor}
              </p>
              <div className="livro-selos" aria-label="Classificação e acesso da obra">
                {livro.selo_independente && <span className="livro-selo livro-selo--independente"><i className="fa-solid fa-feather-pointed"></i> Autor independente</span>}
                {livro.origem === 'licenciado' && <span className="livro-selo"><i className="fa-solid fa-certificate"></i> Acervo licenciado</span>}
                <span className="livro-selo">{livro.modelo_acesso_label}</span>
                {livro.territorio_cultural && <span className="livro-selo"><i className="fa-solid fa-location-dot"></i> {livro.territorio_cultural}</span>}
              </div>
            </div>
            <button onClick={abrirDenuncia} className="btn-denuncia">
              <i className="fa-solid fa-flag"></i> Relatar Problema
            </button>
          </div>

          <div className="metadata-grid">
            <div className="metadata-item">
              <span className="meta-titulo">Gênero / Categoria</span>
              <span className="meta-valor">
                <i className="fa-solid fa-bookmark"></i> {livro.categoria_nome || "Não informado"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="meta-titulo">Ano / Data de Publicação</span>
              <span className="meta-valor">
                <i className="fa-regular fa-calendar-days"></i> {livro.ano_publicacao || "Não informado"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="meta-titulo">ISBN</span>
              <span className="meta-valor">
                <i className="fa-solid fa-barcode"></i> {livro.isbn || "Não cadastrado"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="meta-titulo">Edição / Organização</span>
              <span className="meta-valor">
                <i className="fa-solid fa-layer-group"></i> {livro.edicao || "1ª Edição"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="meta-titulo">Páginas (Aprox.)</span>
              <span className="meta-valor">
                <i className="fa-solid fa-file-lines"></i> {livro.paginas || "---"}
              </span>
            </div>

            <div className="metadata-item">
              <span className="meta-titulo">Avaliação Média</span>
              <span className="meta-valor">
                <i className="fa-solid fa-star"></i> {livro.avaliacao || "S/N"} / 5
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
        <h2 className="avaliacoes-titulo" data-revelar>
          <i className="fa-solid fa-comments"></i> Avaliações da Comunidade
        </h2>

        {user && (
          <div className="minha-avaliacao-card glass-card" data-revelar>
            {minhaAvaliacao ? (
              <div className="minha-avaliacao-header">
                <div>
                  <h4>Sua Avaliação</h4>
                  <div className="minha-avaliacao-nota">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i key={star} className={`fa-${star <= minhaAvaliacao.nota ? 'solid' : 'regular'} fa-star`}></i>
                    ))}
                  </div>
                  <p className="minha-avaliacao-texto">
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
                <h4>O que você achou desta obra?</h4>
                <form onSubmit={handleAvaliar} className="form-avaliacao">
                  <div className="form-avaliacao-linha">
                    <label>Sua Nota:</label>
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

        <div className="avaliacoes-grid" data-revelar-cascata>
          {avaliacoes.length > 0 ? (
            avaliacoes.map((ava) => (
              <div key={ava.id} className="avaliacao-card glass-card" data-revelar>
                <div className="avaliacao-header">
                  <strong className="avaliacao-user">
                    {ava.usuario_foto ? (
                      <img src={ava.usuario_foto} alt="" className="avaliacao-avatar" loading="lazy" decoding="async" width="44" height="44" />
                    ) : (
                      <i className="fa-solid fa-user-circle avaliacao-avatar-vazio"></i>
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
            <div className="empty-avaliacoes" data-revelar>
              <i className="fa-solid fa-star-half-stroke"></i>
              <p>
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
