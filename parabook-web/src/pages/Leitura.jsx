import { useState, useEffect, useRef, useContext } from 'react';
import { useParams, Link } from 'react-router-dom';
import swal, { BOTAO } from '../services/swal';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';
import '../assets/css/leitura.css';

function Leitura() {
  const { id } = useParams();
  const { user } = useContext(AuthContext);
  
  // PDF.js State
  const canvasRef = useRef(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [zoomAtual, setZoomAtual] = useState(1.5);
  
  // UI States
  const [altoContraste, setAltoContraste] = useState(false);
  const [modoInvertido, setModoInvertido] = useState(false);
  const [expandir, setExpandir] = useState(false);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  
  // Estante states
  const [idEstante, setIdEstante] = useState(null);
  const [lido, setLido] = useState(false);
  const [favorito, setFavorito] = useState(false);
  
  const [inputPag, setInputPag] = useState('');

  // Initial load
  useEffect(() => {
    if (!user) return; // Aguarda o user estar logado (protegido por rotas)

    setLoading(true);
    setErro(null);

    const fetchData = async () => {
      try {
        if (!window.pdfjsLib) {
          throw new Error("Biblioteca PDF.js não encontrada.");
        }
        
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

        // 1. Busca os detalhes da estante (para saber se já está lido, favorito, etc)
        const resEstante = await api.get('/biblioteca/estante/');
        const estanteData = resEstante.data.results || resEstante.data;
        const entry = estanteData.find(e => e.livro === parseInt(id));
        if (entry) {
          setIdEstante(entry.id);
          setLido(entry.status === 'lido');
          setFavorito(entry.favorito);
        }

        // 2. Busca o arquivo PDF
        const response = await api.get(`/biblioteca/livros/${id}/ler_pdf/`, {
          responseType: 'arraybuffer'
        });

        const pdf = await window.pdfjsLib.getDocument({ data: response.data }).promise;
        setPdfDoc(pdf);
        setTotalPaginas(pdf.numPages);
        
        // Recuperar progresso
        const pagSalva = localStorage.getItem(`pagina_${id}`);
        if (pagSalva && parseInt(pagSalva) <= pdf.numPages) {
          setPaginaAtual(parseInt(pagSalva));
        } else {
          setPaginaAtual(1);
        }

        setLoading(false);
      } catch (err) {
        console.error(err);
        if (err.response?.status === 403) {
          setErro("Acesso Negado: Você não tem permissão para ler este livro.");
        } else {
          setErro("Erro ao carregar o arquivo PDF. Verifique se o livro possui PDF e tente novamente.");
        }
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  // Render page when pdfDoc, page or zoom changes
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isRenderCancelled = false;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(paginaAtual);
        const viewport = page.getViewport({ scale: zoomAtual });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: ctx,
          viewport: viewport
        };

        await page.render(renderContext).promise;
        
        if (!isRenderCancelled) {
          localStorage.setItem(`pagina_${id}`, paginaAtual);
        }
      } catch (err) {
        console.error("Render error:", err);
      }
    };

    renderPage();

    return () => {
      isRenderCancelled = true;
    };
  }, [pdfDoc, paginaAtual, zoomAtual, id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      if (e.key === "ArrowLeft") {
        setPaginaAtual(prev => Math.max(prev - 1, 1));
      } else if (e.key === "ArrowRight") {
        setPaginaAtual(prev => (totalPaginas > 0 ? Math.min(prev + 1, totalPaginas) : prev));
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [totalPaginas]);

  // Actions
  const syncEstante = async (dados) => {
    try {
      if (idEstante) {
        await api.patch(`/biblioteca/estante/${idEstante}/`, dados);
      } else {
        const res = await api.post(`/biblioteca/estante/`, {
          livro: parseInt(id),
          status: 'lendo',
          ...dados
        });
        setIdEstante(res.data.id);
      }
    } catch (error) {
      console.error("Erro ao sincronizar estante", error);
    }
  };

  const handleMarcarLido = () => {
    swal.fire({
      title: 'Concluir Livro?',
      text: "Deseja marcar este livro como concluído em sua estante?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: BOTAO.sucesso,
      cancelButtonColor: BOTAO.neutro,
      confirmButtonText: 'Sim, concluído!',
      cancelButtonText: 'Ainda não',
      color: '#f8fafc'
    }).then(async (result) => {
      if (result.isConfirmed) {
        await syncEstante({ status: 'lido' });
        setLido(true);
        swal.fire({
          title: 'Parabéns! 🎉',
          text: 'Mais uma obra concluída. Seu progresso foi atualizado!',
          icon: 'success',
          color: '#f8fafc'
        });
      }
    });
  };

  const handleFavoritar = async () => {
    const novoStatus = !favorito;
    await syncEstante({ favorito: novoStatus });
    setFavorito(novoStatus);
    
    if (novoStatus) {
      swal.fire({
        title: 'Favoritado! ❤️',
        text: 'Este livro foi adicionado à sua aba de favoritos.',
        icon: 'success',
        background: '#1e293b', color: '#f8fafc', timer: 2000, showConfirmButton: false
      });
    } else {
      swal.fire({
        title: 'Removido! 💔',
        text: 'O livro foi removido dos seus favoritos.',
        icon: 'info',
        background: '#1e293b', color: '#f8fafc', timer: 2000, showConfirmButton: false
      });
    }
  };

  const handleAvaliar = () => {
    swal.fire({
      title: '⭐ Avalie este Livro',
      text: 'Que nota você dá para esta obra?',
      icon: 'question',
      input: 'select',
      inputOptions: {
        '5': '⭐⭐⭐⭐⭐ (5) - Obra Prima',
        '4': '⭐⭐⭐⭐ (4) - Muito Bom',
        '3': '⭐⭐⭐ (3) - Bom',
        '2': '⭐⭐ (2) - Regular',
        '1': '⭐ (1) - Ruim'
      },
      inputPlaceholder: 'Selecione uma nota...',
      showCancelButton: true,
      confirmButtonText: 'Enviar Avaliação',
      cancelButtonText: 'Cancelar',
      background: '#1e293b', 
      color: '#f8fafc',
      inputValidator: (value) => {
        return new Promise((resolve) => {
          if (value) { resolve(); } 
          else { resolve('Você precisa selecionar uma nota!'); }
        });
      }
    }).then(async (result) => {
      if (result.isConfirmed && result.value) {
        await syncEstante({ nota: parseInt(result.value) });
        swal.fire({
          title: 'Avaliação Salva!',
          text: 'Sua nota foi registrada com sucesso.',
          icon: 'success',
          background: '#1e293b', color: '#f8fafc', timer: 2000, showConfirmButton: false
        });
      }
    });
  };

  const irParaPagina = () => {
    const p = parseInt(inputPag);
    if (!isNaN(p) && p >= 1 && p <= totalPaginas) {
      setPaginaAtual(p);
      setInputPag('');
    } else {
      alert(`Por favor, insira um número entre 1 e ${totalPaginas}.`);
    }
  };

  // Progress calculations
  const progressoSeguro = totalPaginas > 0 ? Math.min(Math.max((paginaAtual / totalPaginas) * 100, 0), 100) : 0;

  return (
    <main className="leitura-page" tabIndex="-1">
      <section className="container leitura-container">
        
        <header className="leitura-acessivel-header">
          <h1 className="sr-only">Lendo: Obra de Teste</h1>
        </header>

        <nav className="barra-ferramentas-leitura" aria-label="Ferramentas de customização da leitura">
          <div className="grupo-controle">
            <span className="label-controle" id="label-zoom">Zoom Canvas:</span>
            <button className="btn-tool" onClick={() => setZoomAtual(z => Math.min(z + 0.1, 3.0))} title="Aumentar zoom">
              <i className="fa-solid fa-magnifying-glass-plus" aria-hidden="true"></i>
              <span className="sr-only">Aumentar Zoom</span>
            </button>
            <button className="btn-tool" onClick={() => setZoomAtual(z => Math.max(z - 0.1, 0.8))} title="Diminuir zoom">
              <i className="fa-solid fa-magnifying-glass-minus" aria-hidden="true"></i>
              <span className="sr-only">Diminuir Zoom</span>
            </button>
          </div>

          <div className="grupo-controle">
            <span className="label-controle" id="label-acessibilidade">Acessibilidade Visual:</span>
            <button className="btn-tool" onClick={() => setAltoContraste(!altoContraste)} title="Alternar Alto Contraste">
              <i className="fa-solid fa-circle-half-stroke" aria-hidden="true"></i> Contraste
            </button>
            <button className="btn-tool" onClick={() => setModoInvertido(!modoInvertido)} title="Inverter cores da página">
              <i className="fa-solid fa-eye-dropper" aria-hidden="true"></i> Inverter Cores
            </button>
          </div>

          <div className="grupo-controle">
            <span className="label-controle" id="label-layout">Layout do Leitor:</span>
            <button className="btn-tool" onClick={() => setExpandir(!expandir)} title="Alternar largura expandida">
              <i className="fa-solid fa-arrows-left-right" aria-hidden="true"></i> Expandir Tela
            </button>
          </div>
        </nav>

        {loading && <div className="loading-state">Carregando PDF imersivo... aguarde.</div>}
        {erro && <div className="loading-state" style={{ color: '#f87171' }}>⚠️ {erro}</div>}

        <article 
          className={`leitor-pdf ${altoContraste ? 'alto-contraste-filtro' : ''} ${modoInvertido ? 'modo-invertido-filtro' : ''}`}
          style={{ maxWidth: expandir ? '100%' : '900px' }}
        >
          <canvas
            ref={canvasRef}
            id="pdf-canvas"
            role="document"
            aria-label={`Visualizador do livro contendo a página ${paginaAtual} de ${totalPaginas}`}
          ></canvas>
        </article>

        <div className="progresso-container" role="progressbar" aria-valuemin="1" aria-valuemax="100" aria-valuenow={Math.round(progressoSeguro)}>
          <div id="barra-progresso" style={{ width: `${progressoSeguro}%` }}></div>
        </div>

        <nav className="controles-leitura" aria-label="Controles de paginação">
          <button className="btn" onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))} disabled={paginaAtual <= 1}>
            <i className="fa-solid fa-arrow-left" aria-hidden="true"></i> Anterior
          </button>
          
          <span id="pagina-info" aria-live="assertive" role="status">
            {totalPaginas > 0 ? `Página ${paginaAtual} de ${totalPaginas}` : 'Carregando...'}
          </span>

          <div className="navegacao-rapida">
            <input
              type="number"
              className="input-pagina-moderno"
              min="1"
              placeholder="Ir para..."
              value={inputPag}
              onChange={(e) => setInputPag(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && irParaPagina()}
            />
            <button className="btn secondary" onClick={irParaPagina} style={{ padding: '8px 18px' }}>
              Ir
            </button>
          </div>

          <button className="btn" onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))} disabled={paginaAtual >= totalPaginas}>
            Próxima <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </nav>

        <div className="acoes">
          <Link to="/minha-biblioteca" className="btn secondary">
            Voltar à Biblioteca
          </Link>

          <button
            className="btn btn-success interactive"
            /* O verde vem de --success agora; era #10b981/#059669, um
               emerald de outra paleta. Concluído fica na versão apagada,
               que já comunica "não há mais o que fazer aqui". */
            style={{
              backgroundColor: lido ? 'rgba(var(--success-rgb),.35)' : 'var(--success)',
              borderColor: 'transparent',
            }}
            onClick={handleMarcarLido}
            disabled={lido}
          >
            <i className="fa-solid fa-check-double"></i> {lido ? 'Concluído!' : 'Marcar como Lido'}
          </button>

          <button
            className="btn"
            style={{ backgroundColor: favorito ? '#db2777' : '#ec4899', color: 'white' }}
            onClick={handleFavoritar}
          >
            {favorito ? <><i className="fa-solid fa-heart-crack"></i> Desfavoritar</> : <><i className="fa-solid fa-heart"></i> Favoritar</>}
          </button>

          <button
            className="btn"
            style={{ backgroundColor: '#f59e0b', color: 'white' }}
            onClick={handleAvaliar}
          >
            <i className="fa-solid fa-star"></i> Avaliar
          </button>
        </div>

      </section>
    </main>
  );
}

export default Leitura;
