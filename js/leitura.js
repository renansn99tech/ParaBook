
let pdfDoc = null;
let paginaAtual = 1;
let totalPaginas = 0;
let livroAtualId = null;

/* =========================
CARREGA DADOS DO LIVRO
========================= */
function carregarLeitura() {

    const params = new URLSearchParams(window.location.search);
    const id = params.get("livro");

    livroAtualId = id;

    const livro = livros?.[id];

    if (!livro) {
        document.getElementById("titulo").innerText = "Livro não encontrado";
        return;
    }

    document.getElementById("titulo").innerText = livro.nome;
    document.getElementById("autor").innerText = `Autor: ${livro.autor}`;

    paginaAtual = Number(localStorage.getItem(`pagina_${id}`)) || 1;

    carregarPDF(livro.caminho);
}

/* =========================
CARREGAMENTO PDF
========================= */
function carregarPDF(caminho) {

    if (!window.pdfjsLib) return;

    pdfjsLib.getDocument(caminho).promise.then(pdf => {

        pdfDoc = pdf;
        totalPaginas = pdf.numPages;

        // GARANTE QUE A BARRA NÃO DIVIDA POR ZERO
        if (totalPaginas === 0) totalPaginas = 1;

        localStorage.setItem(`total_${livroAtualId}`, totalPaginas);

        if (paginaAtual > totalPaginas) paginaAtual = 1;

        // ATUALIZA UI IMEDIATAMENTE
        atualizarUI();

        renderizarPagina(paginaAtual);
    });
}

/* =========================
RENDERIZA PÁGINA
========================= */
function renderizarPagina(numero) {

    if (!pdfDoc) return;

    pdfDoc.getPage(numero).then(page => {

        const canvas = document.getElementById("pdf-canvas");
        const ctx = canvas.getContext("2d");

        const viewport = page.getViewport({ scale: 1.5 });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        page.render({ canvasContext: ctx, viewport });

        paginaAtual = numero;

        salvarProgresso();

        // ATUALIZA UI APÓS DEFINIR PÁGINA
        atualizarUI();
    });
}

/* =========================
NAVEGAÇÃO
========================= */
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

/* =========================
ATUALIZAÇÃO CENTRAL
========================= */
function atualizarUI() {
    atualizarBarra();
    atualizarPaginaInfo();
}

/* =========================
BARRA DE PROGRESSO (CORRIGIDA)
========================= */
function atualizarBarra() {

    const barra = document.getElementById("barra-progresso");
    if (!barra) return;

    // EVITA BUG QUANDO TOTAL = 0
    if (totalPaginas <= 0) {
        barra.style.width = "0%";
        return;
    }

    const progresso = (paginaAtual / totalPaginas) * 100;

    // GARANTE VALORES ENTRE 0 E 100
    const progressoSeguro = Math.min(Math.max(progresso, 0), 100);

    barra.style.width = progressoSeguro + "%";
}

/* =========================
INFO DE PÁGINA
========================= */
function atualizarPaginaInfo() {
    const info = document.getElementById("pagina-info");
    if (!info) return;

    info.innerText = `Página ${paginaAtual} de ${totalPaginas}`;
}

/* =========================
SALVA PROGRESSO
========================= */
function salvarProgresso() {
    localStorage.setItem(`pagina_${livroAtualId}`, paginaAtual);
}

/* =========================
INIT
========================= */
document.addEventListener("DOMContentLoaded", carregarLeitura);