let chartCategorias = null;
let chartBarra = null;
let chartPizza = null;
let chartLinha = null;
// =======================
// CONFIG
// =======================
const USER = "admin";
const PASS = "123";

// =======================
// STATE CENTRAL
// =======================
const state = {
    livros: [],
    filtro: ""
};

// =======================
// INIT
// =======================
document.addEventListener("DOMContentLoaded", () => {
    bindEvents();

    if (localStorage.getItem("adminLogado")) {
        entrar();
    }
});

// =======================
// EVENTOS
// =======================
function bindEvents() {
    document.getElementById("btnLogin")?.addEventListener("click", login);
    document.getElementById("btnLogout")?.addEventListener("click", logout);
    document.getElementById("btnAdd")?.addEventListener("click", adicionarLivro);
    document.getElementById("busca")?.addEventListener("input", buscarLivro);

    document.querySelectorAll("[data-nav]").forEach(btn => {
        btn.addEventListener("click", () => {
            mostrarSecao(btn.dataset.nav);
        });
    });
}

// =======================
// LOGIN
// =======================
function login() {
    const user = document.getElementById("user").value;
    const pass = document.getElementById("pass").value;

    if (user === USER && pass === PASS) {
        localStorage.setItem("adminLogado", "true");
        entrar();
    } else {
        alert("Login inválido");
    }
}

function entrar() {
    document.getElementById("login").style.display = "none";
    document.getElementById("app").style.display = "flex";

    state.livros = carregarStorage();
    render();
}

// =======================
// LOGOUT
// =======================
function logout() {
    localStorage.removeItem("adminLogado");
    location.reload();
}

// =======================
// NAVEGAÇÃO
// =======================
function mostrarSecao(secao) {
    document.querySelectorAll(".secao").forEach(s => {
        s.style.display = "none";
    });

    const el = document.getElementById(secao);
    if (el) el.style.display = "block";
}

// =======================
// CRUD
// =======================
function adicionarLivro() {
    const tituloInput = document.getElementById("titulo");
    const categoriaInput = document.getElementById("categoria");

    const titulo = tituloInput.value.trim();
    const categoria = categoriaInput.value.trim();

    if (!titulo || !categoria) {
        alert("Preencha todos os campos");
        return;
    }

    const novoLivro = {
        id: Date.now(),
        titulo,
        categoria,
        criadoEm: new Date().toISOString()
    };

    state.livros = [novoLivro, ...state.livros];

    salvarStorage();
    limparFormulario();
    render();
}

function removerLivro(id) {
    state.livros = state.livros.filter(l => l.id !== id);
    salvarStorage();
    render();
}

// =======================
// BUSCA
// =======================
function buscarLivro(e) {
    state.filtro = e.target.value.toLowerCase();
    renderLista();
}

// =======================
// RENDER PRINCIPAL
// =======================
function render() {
    atualizarDashboard();
    renderLista();
}

// =======================
// DASHBOARD (AGORA FUNCIONA)
// =======================
function atualizarDashboard() {
    const totalEl = document.getElementById("totalLivros");

    if (!totalEl) return;

    totalEl.textContent = state.livros.length;

    // =====================
    // AGRUPAR CATEGORIAS
    // =====================
    const categorias = {};

    state.livros.forEach(l => {
        const cat = l.categoria || "Sem categoria";
        categorias[cat] = (categorias[cat] || 0) + 1;
    });

    const labels = Object.keys(categorias);
    const dados = Object.values(categorias);

    // =====================
    // GRÁFICO DE BARRA
    // =====================
    if (chartBarra) chartBarra.destroy();

    chartBarra = new Chart(document.getElementById("graficoBarra"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Livros",
                data: dados,
                backgroundColor: "#22c55e"
            }]
        },
        options: {
            responsive: true
        }
    });

    // =====================
    // GRÁFICO DE PIZZA
    // =====================
    if (chartPizza) chartPizza.destroy();

    chartPizza = new Chart(document.getElementById("graficoPizza"), {
        type: "pie",
        data: {
            labels,
            datasets: [{
                data: dados,
                backgroundColor: [
                    "#22c55e",
                    "#3b82f6",
                    "#f59e0b",
                    "#ef4444",
                    "#a855f7"
                ]
            }]
        }
    });

    // =====================
    // GRÁFICO DE LINHA (CRESCIMENTO)
    // =====================
    const datas = {};

    state.livros.forEach(l => {
        const data = new Date(l.criadoEm).toLocaleDateString();
        datas[data] = (datas[data] || 0) + 1;
    });

    const labelsLinha = Object.keys(datas);
    const dadosLinha = Object.values(datas);

    if (chartLinha) chartLinha.destroy();

    chartLinha = new Chart(document.getElementById("graficoLinha"), {
        type: "line",
        data: {
            labels: labelsLinha,
            datasets: [{
                label: "Livros adicionados",
                data: dadosLinha,
                borderColor: "#22c55e",
                fill: false,
                tension: 0.3
            }]
        }
    });
}

// =======================
// LISTA (SEM BUG DE INDEX)
// =======================
function renderLista() {
    const ul = document.getElementById("listaLivros");
    ul.innerHTML = "";

    const filtrados = state.livros.filter(l =>
        l.titulo.toLowerCase().includes(state.filtro)
    );

    filtrados.forEach(livro => {
        const li = document.createElement("li");

        const dataFormatada = new Date(livro.criadoEm).toLocaleDateString();

        li.innerHTML = `
            <div>
                <strong>${livro.titulo}</strong><br>
                <small>${livro.categoria} • ${dataFormatada}</small>
            </div>
            <button data-id="${livro.id}">❌</button>
        `;

        li.querySelector("button").addEventListener("click", () => {
            removerLivro(livro.id);
        });

        ul.appendChild(li);
    });
}

// =======================
// STORAGE
// =======================
function salvarStorage() {
    localStorage.setItem("livros", JSON.stringify(state.livros));
}

function carregarStorage() {
    try {
        return JSON.parse(localStorage.getItem("livros")) || [];
    } catch {
        return [];
    }
}

// =======================
// UTIL
// =======================
function limparFormulario() {
    document.getElementById("titulo").value = "";
    document.getElementById("categoria").value = "";
}