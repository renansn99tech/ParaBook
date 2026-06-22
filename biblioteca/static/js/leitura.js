let pdfDoc = null;
let paginaAtual = 1;
let totalPaginas = 0;
let livroAtualId = null;

/* =========================
INIT 
========================= */
document.addEventListener("DOMContentLoaded", () => {
    console.log("Leitura iniciada direto pelos dados do banco.");
    carregarLeituraDireta();
});

/* =========================
CARREGA DADOS DIRETO DO HTML (BANCO DE DADOS)
========================= */
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
            exibirErro("Erro ao carregar o arquivo PDF. Verifique se o caminho está correto.");
        });
}

/* =========================
RENDERIZA PÁGINA
========================= */
function renderizarPagina(numero) {
    if (!pdfDoc) return;

    pdfDoc.getPage(numero).then(page => {
        const canvas = document.getElementById("pdf-canvas");
        if (!canvas) return;
        
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
    const container = document.querySelector(".leitor-pdf");
    if (container) {
        container.innerHTML = `<p style="color:red; text-align:center; padding: 20px;">⚠️ ${msg}</p>`;
    } else {
        document.body.innerHTML = `<p style="color:red; text-align:center; padding: 50px;">⚠️ ${msg}</p>`;
    }
}