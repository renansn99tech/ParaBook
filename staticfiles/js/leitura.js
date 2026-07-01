let pdfDoc = null;
let paginaAtual = 1;
let totalPaginas = 0;
let livroAtualId = null;
let zoomAtual = 1.5; // Centralizado o estado do zoom padrão

/* =========================================
INIT E BIND DE EVENTOS
========================================= */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Leitura iniciada. Inicializando componentes e eventos...");
    carregarLeituraDireta();
    inicializarEventos();
});

function inicializarEventos() {
    // Eventos de paginação nos botões inferiores
    document.getElementById("btn-anterior")?.addEventListener("click", paginaAnterior);
    document.getElementById("btn-proxima")?.addEventListener("click", proximaPagina);

    // Eventos da barra de ferramentas superior (Antigos onclick que estavam no HTML)
    document.getElementById("btn-zoom-in")?.addEventListener("click", () => alterarZoom(0.1));
    document.getElementById("btn-zoom-out")?.addEventListener("click", () => alterarZoom(-0.1));
    document.getElementById("btn-contraste")?.addEventListener("click", toggleAltoContraste);
    document.getElementById("btn-inverter")?.addEventListener("click", toggleInverterCores);
    document.getElementById("btn-expandir")?.addEventListener("click", toggleLarguraTotal);

    // Acessibilidade: Navegação nativa por teclado usando setas laterais (Esquerda / Direita)
    document.addEventListener("keydown", (e) => {
        if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
        
        if (e.key === "ArrowLeft") {
            paginaAnterior();
        } else if (e.key === "ArrowRight") {
            proximaPagina();
        }
    });
}

/* =========================================
CARREGA DADOS DIRETO DO HTML (BANCO DE DADOS)
========================================= */
function carregarLeituraDireta() {
    // Pega o elemento do HTML que recebeu os dados do Django
    const elementoDados = document.getElementById("dados-livro");

    if (!elementoDados) {
        exibirErro("Erro crítico: Elemento de dados do livro não encontrado no HTML.");
        return;
    }

    // Lê os atributos data- que o Django preencheu no HTML
    const id = elementoDados.getAttribute("data-id");
    const caminhoPDF = elementoDados.getAttribute("data-caminho");

    if (!id || !caminhoPDF) {
        exibirErro("Dados do livro ou arquivo PDF não encontrados.");
        return;
    }

    livroAtualId = id;

    // Recupera a página onde o usuário parou do localStorage
    paginaAtual = Number(localStorage.getItem(`pagina_${id}`)) || 1;

    // Carrega o PDF diretamente usando o caminho vindo do banco
    carregarPDF(caminhoPDF);
}

/* =========================================
CARREGAMENTO PDF (PDF.JS)
========================================= */
function carregarPDF(caminho) {
    if (!window.pdfjsLib) {
        exibirErro("Biblioteca PDF não carregada.");
        return;
    }

    pdfjsLib.getDocument(caminho).promise
        .then(pdf => {
            pdfDoc = pdf;
            totalPaginas = pdf.numPages || 1;

            localStorage.setItem(`total_${livroAtualId}`, totalPaginas);

            if (paginaAtual > totalPaginas) {
                paginaAtual = 1;
            }

            atualizarUI();
            renderizarPagina(paginaAtual);
        })
        .catch(error => {
            console.error("Erro detalhado do PDF.js:", error);
            exibirErro("Erro ao carregar o arquivo PDF. Verifique se o caminho ou as configurações de mídia do Django estão corretas.");
        });
}

/* =========================================
RENDERIZA PÁGINA COM RÓTULOS ACESSÍVEIS
========================================= */
function renderizarPagina(numero) {
    if (!pdfDoc) return;

    pdfDoc.getPage(numero).then(page => {
        const canvas = document.getElementById("pdf-canvas");
        if (!canvas) return;
        
        const ctx = canvas.getContext("2d");
        const viewport = page.getViewport({ scale: zoomAtual });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        page.render({ canvasContext: ctx, viewport });

        paginaAtual = numero;

        // WCAG: Atualiza o rótulo descritivo do Canvas dinamicamente para leitores de tela
        canvas.setAttribute('aria-label', `Visualizador do livro contendo a página ${numero} de ${totalPaginas}`);

        salvarProgresso();
        atualizarUI();
    });
}

/* =========================================
CONTROLES DA BARRA DE FERRAMENTAS
========================================= */
function alterarZoom(fator) {
    zoomAtual = Math.min(Math.max(zoomAtual + fator, 0.8), 3.0);
    renderizarPagina(paginaAtual);
}

function toggleAltoContraste() {
    document.getElementById("leitor-pdf-container")?.classList.toggle("alto-contraste-filtro");
}

function toggleInverterCores() {
    document.getElementById("leitor-pdf-container")?.classList.toggle("modo-invertido-filtro");
}

function toggleLarguraTotal() {
    const container = document.getElementById("leitor-pdf-container");
    if (container) {
        container.style.maxWidth = container.style.maxWidth === "100%" ? "900px" : "100%";
    }
}

/* =========================================
NAVEGAÇÃO
========================================= */
function proximaPagina() {
    if (paginaAtual < totalPaginas) {
        renderizarPagina(paginaAtual + 1);
    }
}

function paginaAnterior() {
    if (paginaAtual > 1) {
        renderizarPagina(paginaAtual - 1);
    }
}

/* =========================================
UI CENTRAL & PROGRESSO ACESSÍVEL
========================================= */
function atualizarUI() {
    atualizarBarra();
    atualizarPaginaInfo();
}

function atualizarBarra() {
    const barra = document.getElementById("barra-progresso");
    const containerAcessivel = document.getElementById("progresso-acessivel");
    
    if (!barra) return;

    if (totalPaginas <= 0) {
        barra.style.width = "0%";
        return;
    }

    const porcentagem = (paginaAtual / totalPaginas) * 100;
    const seguro = Math.min(Math.max(porcentagem, 0), 100);

    barra.style.width = `${seguro}%`;

    // Atualiza o progresso numérico no container acessível para leitores de tela
    if (containerAcessivel) {
        containerAcessivel.setAttribute("aria-valuenow", Math.round(seguro));
    }
}

function atualizarPaginaInfo() {
    const info = document.getElementById("pagina-info");
    
    if (!info) return;

    info.innerText = `Página ${paginaAtual} de ${totalPaginas}`;
}

/* =========================================
SALVAR PROGRESSO
========================================= */
function salvarProgresso() {
    if (livroAtualId) {
        localStorage.setItem(`pagina_${livroAtualId}`, paginaAtual);
    }
}

/* =========================================
ERRO VISUAL ACESSÍVEL
======================================== */
function exibirErro(msg) {
    const container = document.querySelector(".leitor-pdf");
    if (container) {
        container.innerHTML = `<p style="color:#f87171; text-align:center; padding: 20px; font-weight: 600;">⚠️ ${msg}</p>`;
    } else {
        document.body.innerHTML = `<p style="color:#f87171; text-align:center; padding: 50px; font-weight: 600;">⚠️ ${msg}</p>`;
    }
}