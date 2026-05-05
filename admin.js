// =======================
// CHARTS
// =======================
let chartBarra = null;
let chartPizza = null;
let chartLinha = null;

// =======================
// CONFIG
// =======================
const USER = "admin";
const PASS = "123";

// =======================
// STATE
// =======================
const state = {
    livros: [],
    usuarios: [],
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
    document.getElementById("btnAddUser")?.addEventListener("click", adicionarUsuario);

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

    state.livros = carregar("livros");
    state.usuarios = carregar("usuarios");

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
// LIVROS
// =======================
function adicionarLivro() {
    const titulo = document.getElementById("titulo").value.trim();
    const categoria = document.getElementById("categoria").value;

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

    state.livros.unshift(novoLivro);
    salvar("livros", state.livros);

    limparFormulario();
    render();
}

function removerLivro(id) {
    state.livros = state.livros.filter(l => l.id !== id);
    salvar("livros", state.livros);
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
// USUÁRIOS
// =======================
function adicionarUsuario() {
    const nome = document.getElementById("novoUsuario").value.trim();
    const role = document.getElementById("roleUsuario").value;

    if (!nome) {
        alert("Digite um nome");
        return;
    }

    const novoUsuario = {
        id: Date.now(),
        nome,
        role
    };

    state.usuarios.push(novoUsuario);
    salvar("usuarios", state.usuarios);

    document.getElementById("novoUsuario").value = "";

    renderUsuarios();
    renderPermissoes();
}

// =======================
// RENDER GERAL
// =======================
function render() {
    atualizarDashboard();
    renderLista();
    renderUsuarios();
    renderPermissoes();
}

// =======================
// DASHBOARD
// =======================
function atualizarDashboard() {
    const totalEl = document.getElementById("totalLivros");
    if (!totalEl) return;

    totalEl.textContent = state.livros.length;

    const categorias = {};

    state.livros.forEach(l => {
        const cat = l.categoria || "Sem categoria";
        categorias[cat] = (categorias[cat] || 0) + 1;
    });

    const labels = Object.keys(categorias);
    const dados = Object.values(categorias);

    if (chartBarra) chartBarra.destroy();
    chartBarra = new Chart(document.getElementById("graficoBarra"), {
        type: "bar",
        data: {
            labels,
            datasets: [{
                data: dados,
                backgroundColor: "#22c55e"
            }]
        }
    });

    if (chartPizza) chartPizza.destroy();
    chartPizza = new Chart(document.getElementById("graficoPizza"), {
        type: "pie",
        data: {
            labels,
            datasets: [{
                data: dados
            }]
        }
    });

    const datas = {};

    state.livros.forEach(l => {
        const d = new Date(l.criadoEm).toLocaleDateString();
        datas[d] = (datas[d] || 0) + 1;
    });

    const labelsLinha = Object.keys(datas);
    const dadosLinha = Object.values(datas);

    if (chartLinha) chartLinha.destroy();
    chartLinha = new Chart(document.getElementById("graficoLinha"), {
        type: "line",
        data: {
            labels: labelsLinha,
            datasets: [{
                data: dadosLinha,
                borderColor: "#22c55e",
                fill: false
            }]
        }
    });
}

// =======================
// LISTA DE LIVROS
// =======================
function renderLista() {
    const ul = document.getElementById("listaLivros");
    if (!ul) return;

    ul.innerHTML = "";

    const filtrados = state.livros.filter(l =>
        l.titulo.toLowerCase().includes(state.filtro)
    );

    filtrados.forEach(l => {
        const li = document.createElement("li");

        li.innerHTML = `
            <div>
                <strong>${l.titulo}</strong><br>
                <small>${l.categoria}</small>
            </div>
            <button>❌</button>
        `;

        li.querySelector("button").onclick = () => removerLivro(l.id);

        ul.appendChild(li);
    });
}

// =======================
// USUÁRIOS
// =======================
function renderUsuarios() {
    const ul = document.getElementById("listaUsuarios");
    if (!ul) return;

    ul.innerHTML = "";

    state.usuarios.forEach(u => {
        const li = document.createElement("li");

        li.innerHTML = `
            <span>${u.nome} (${u.role})</span>
        `;

        ul.appendChild(li);
    });
}

// =======================
// PERMISSÕES
// =======================
function renderPermissoes() {
    const ul = document.getElementById("listaPermissoes");
    if (!ul) return;

    ul.innerHTML = "";

    state.usuarios.forEach(u => {
        let permissao = "";

        if (u.role === "ADMIN") permissao = "Acesso total";
        else if (u.role === "AUTOR") permissao = "Criar conteúdo";
        else permissao = "Somente leitura";

        const li = document.createElement("li");

        li.innerHTML = `
            <span>${u.nome}</span>
            <span>${permissao}</span>
        `;

        ul.appendChild(li);
    });
}

// =======================
// STORAGE
// =======================
function salvar(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function carregar(key) {
    try {
        return JSON.parse(localStorage.getItem(key)) || [];
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