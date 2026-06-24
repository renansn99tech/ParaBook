let chartBarra = null;
let chartPizza = null;
let chartLinha = null;

document.addEventListener("DOMContentLoaded", () => {
    bindEvents();
    renderGraficos();
});

function bindEvents() {
    document.getElementById("busca")?.addEventListener("input", buscarLivro);

    // Mapeia cliques nos botões da sidebar
    document.querySelectorAll("[data-nav]").forEach(btn => {
        btn.addEventListener("click", () => {
            mostrarSecao(btn.dataset.nav);
        });
    });

    // Gatilhos para o botão editar ✏️
    document.querySelectorAll(".btn-editar-trigger").forEach(btn => {
        btn.addEventListener("click", () => {
            prepararEdicao(btn.dataset.id, btn.dataset.titulo, btn.dataset.categoria);
        });
    });

    // Botão cancelar edição
    document.getElementById("btnCancelarEdicao")?.addEventListener("click", cancelarEdicao);
}

function mostrarSecao(secao) {
    document.querySelectorAll(".secao").forEach(s => {
        s.style.display = "none";
    });
    const el = document.getElementById(secao);
    if (el) el.style.display = "block";
}

function buscarLivro(e) {
    const termo = e.target.value.toLowerCase();
    const itens = document.querySelectorAll("#listaLivros li");

    itens.forEach(li => {
        const titulo = li.getAttribute("data-titulo");
        if (titulo) {
            li.style.display = titulo.includes(termo) ? "flex" : "none";
        }
    });
}

// --- FUNÇÕES DE UPDATE (INTERAÇÃO DO VISUAL) ---
function prepararEdicao(id, titulo, categoria) {
    // Rola suavemente até o formulário
    document.getElementById("tituloSecaoLivros")?.scrollIntoView({ behavior: 'smooth' });

    // Preenche os inputs com os dados do livro selecionado
    document.getElementById("inputLivroId").value = id;
    document.getElementById("inputTitulo").value = titulo;
    document.getElementById("selectCategoria").value = categoria;

    // Altera propriedades do botão de envio para agir como Update no Django
    const btnSalvar = document.getElementById("btnSubmeterForm");
    btnSalvar.textContent = "Salvar Alterações";
    btnSalvar.name = "btn_editar_livro"; // Troca o name capturado pelo view.py
    btnSalvar.style.background = "#eab308"; // Muda cor para amarelo (alerta/edição)

    // Exibe o botão de cancelar
    document.getElementById("btnCancelarEdicao").style.display = "inline-block";
}

function cancelarEdicao() {
    // Limpa os campos do formulário
    document.getElementById("inputLivroId").value = "";
    document.getElementById("formLivro").reset();

    // Restaura o botão para o modo de criação padrão
    const btnSalvar = document.getElementById("btnSubmeterForm");
    btnSalvar.textContent = "Adicionar";
    btnSalvar.name = "btn_add_livro";
    btnSalvar.style.background = "var(--primary)";

    // Oculta o botão de cancelar
    document.getElementById("btnCancelarEdicao").style.display = "none";
}

// --- CHARTS (DADOS RENDERIZADOS DO DJANGO) ---
function renderGraficos() {
    const elementoDados = document.getElementById("dados-graficos");
    if (!elementoDados) return;

    const livros = JSON.parse(elementoDados.textContent);
    const categorias = {};
    const datas = {};

    livros.forEach(l => {
        const cat = l.categoria || "Sem categoria";
        categorias[cat] = (categorias[cat] || 0) + 1;

        const dataFormatada = new Date(l.criadoEm).toLocaleDateString();
        datas[dataFormatada] = (datas[dataFormatada] || 0) + 1;
    });

    const labelsCat = Object.keys(categorias);
    const dadosCat = Object.values(categorias);

    const ctxBarra = document.getElementById("graficoBarra");
    if (ctxBarra && labelsCat.length > 0) {
        if (chartBarra) chartBarra.destroy();
        chartBarra = new Chart(ctxBarra, {
            type: "bar",
            data: {
                labels: labelsCat,
                datasets: [{ label: 'Quantidade', data: dadosCat, backgroundColor: "#22c55e" }]
            },
            options: { responsive: true }
        });
    }

    const ctxPizza = document.getElementById("graficoPizza");
    if (ctxPizza && labelsCat.length > 0) {
        if (chartPizza) chartPizza.destroy();
        chartPizza = new Chart(ctxPizza, {
            type: "pie",
            data: {
                labels: labelsCat,
                datasets: [{ data: dadosCat, backgroundColor: ["#22c55e", "#3b82f6", "#ef4444", "#eab308", "#a855f7"] }]
            },
            options: { responsive: true }
        });
    }

    const ctxLinha = document.getElementById("graficoLinha");
    const labelsLinha = Object.keys(datas);
    const dadosLinha = Object.values(datas);

    if (ctxLinha && labelsLinha.length > 0) {
        if (chartLinha) chartLinha.destroy();
        chartLinha = new Chart(ctxLinha, {
            type: "line",
            data: {
                labels: labelsLinha,
                datasets: [{ label: 'Livros Adicionados', data: dadosLinha, borderColor: "#22c55e", tension: 0.1, fill: false }]
            },
            options: { responsive: true }
        });
    }
}