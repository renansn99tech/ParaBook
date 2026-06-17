let pdfDoc = null;
let paginaAtual = 1;
let totalPaginas = 0;
let livroAtualId = null;

/* =========================
INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Leitura iniciada");
    carregarLeitura();
});

/* =========================
CARREGA DADOS DO LIVRO
========================= */
function carregarLeitura() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("livro");

    if (!id) {
        exibirErro("Livro não especificado na URL.");
        return;
    }

    livroAtualId = id;

    carregarDadosLivro(id);
}

/* =========================
BUSCA DADOS DO BACKEND
========================= */
function carregarDadosLivro(id) {
    fetch(`/biblioteca/api/livro/${id}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error("Erro ao buscar livro");
            }
            return response.json();
        })
        .then(livro => {
            atualizarInfoLivro(livro);

            paginaAtual = Number(localStorage.getItem(`pagina_${id}`)) || 1;

            carregarPDF(livro.caminho);
        })
        .catch(error => {
            console.error(error);
            exibirErro("Erro ao carregar livro.");
        });
}

/* =========================
ATUALIZA INFO
========================= */
function atualizarInfoLivro(livro) {
    document.getElementById("titulo").innerText = livro.nome;
    document.getElementById("autor").innerText = `Autor: ${livro.autor}`;
}

/* =========================
CARREGAMENTO PDF
========================= */
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
            console.error(error);
            exibirErro("Erro ao carregar PDF.");
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
UI CENTRAL
========================= */
function atualizarUI() {
    atualizarBarra();
    atualizarPaginaInfo();
}

/* =========================
BARRA DE PROGRESSO
========================= */
function atualizarBarra() {
    const barra = document.getElementById("barra-progresso");
    
    if (!barra) return;

    if (totalPaginas <= 0) {
        barra.style.width = "0%";
        return;
    }

    const porcentagem = (paginaAtual / totalPaginas) * 100;
    const seguro = Math.min(Math.max(porcentagem, 0), 100);

    barra.style.width = `${seguro}%`;
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
SALVAR PROGRESSO
========================= */
function salvarProgresso() {
    localStorage.setItem(`pagina_${livroAtualId}`, paginaAtual);
}

/* =========================
ERRO
========================= */
function exibirErro(msg) {
    document.body.innerHTML = `<p style="color:red;text-align:center;">${msg}</p>`;
}