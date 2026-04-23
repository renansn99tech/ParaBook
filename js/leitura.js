    let pdfDoc = null;
    let paginaAtual = 1;
    let totalPaginas = 0;
    let livroAtualId = null;
    function carregarLeitura() {
    const titulo = document.getElementById("titulo");
    if (!titulo) return;
    const params = new URLSearchParams(window.location.search);
    const id = params.get("livro");
    livroAtualId = id;
    const livro = livros[id];
    if (!livro) {
        titulo.innerText = "Livro não encontrado";
        return;
    }
    document.getElementById("titulo").innerText = livro.nome;
    document.getElementById("autor").innerText = "Autor: " + livro.autor;
    paginaAtual = Number(localStorage.getItem(`pagina_${id}`)) || 1;
    carregarPDF(livro.caminho);
    }
    /*function carregarPDF(caminho) {
    if (!window.pdfjsLib) {
        console.error("PDF.js não carregado");
        return;
    }
    pdfjsLib.getDocument(caminho).promise.then(pdf => {
        pdfDoc = pdf;
        totalPaginas = pdf.numPages;
        if (paginaAtual > totalPaginas) paginaAtual = 1;
        renderizarPagina(paginaAtual);
    });
    }*/
    function carregarPDF(caminho) {
        if (!window.pdfjsLib) return;

        pdfjsLib.getDocument(caminho).promise.then(pdf => {
            pdfDoc = pdf;
            totalPaginas = pdf.numPages;

            // 👇 SALVA TOTAL DE PÁGINAS
            localStorage.setItem(`total_${livroAtualId}`, totalPaginas);

            if (paginaAtual > totalPaginas) paginaAtual = 1;

            renderizarPagina(paginaAtual);
        });
    }
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
        atualizarBarra();
        atualizarPaginaInfo();
    });
    }
    function proximaPagina() {
    if (paginaAtual < totalPaginas) renderizarPagina(paginaAtual + 1);
    }
    function paginaAnterior() {
    if (paginaAtual > 1) renderizarPagina(paginaAtual - 1);
    }
    function atualizarBarra() {
    const barra = document.getElementById("barra-progresso");
    if (!barra) return;
    barra.style.width = (paginaAtual / totalPaginas) * 100 + "%";
    }
    function atualizarPaginaInfo() {
    const info = document.getElementById("pagina-info");
    if (!info) return;
    info.innerText = `Página ${paginaAtual} de ${totalPaginas}`;
    }
    function salvarProgresso() {
    localStorage.setItem(`pagina_${livroAtualId}`, paginaAtual);
    }
    // EXECUÇÃO
    document.addEventListener("DOMContentLoaded", () => {
    carregarLeitura();
    });

