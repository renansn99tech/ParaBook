    const comunidades = {
        filosofia: { titulo: "Filosofia", descricao: "Discussões filosóficas." },
        literatura: { titulo: "Literatura", descricao: "Livros e autores." },
        religioso: { titulo: "Religioso", descricao: "Reflexões espirituais." }
    };

    /* =========================
    USER SAFE
    ========================= */
    function getUser() {
        let user = localStorage.getItem("user");

        if (!user) {
            user = {
                id: Date.now(),
                name: "Usuário"
            };
            localStorage.setItem("user", JSON.stringify(user));
        }

        return JSON.parse(user);
    }

    /* =========================
    STORAGE
    ========================= */
    function getKey(tipo) {
        return `posts_${tipo}`;
    }

    function loadPosts(tipo) {
        return JSON.parse(localStorage.getItem(getKey(tipo))) || [];
    }

    function savePosts(tipo, posts) {
        localStorage.setItem(getKey(tipo), JSON.stringify(posts));
    }

    /* =========================
    INIT
    ========================= */
    document.addEventListener("DOMContentLoaded", () => {
        carregarDetalheComunidade();
    });

    function showWelcomeOverlay(tipo) {
    const overlay = document.getElementById("welcome-overlay");
    const text = document.getElementById("welcome-text");

    if (!overlay || !tipo) return;

    const comunidade = comunidades[tipo];
    if (!comunidade) return;

    const key = `welcome_${tipo}`;

    // se já mostrou antes, não mostra de novo
    if (localStorage.getItem(key)) {
        overlay.style.display = "none";
        return;
    }

    // define o texto dinâmico
    text.innerText = `Bem-vindo à comunidade de ${comunidade.titulo}`;

    // espera carregar e depois some
    setTimeout(() => {
        overlay.style.opacity = "0";

        setTimeout(() => {
            overlay.style.display = "none";
        }, 800);
    }, 2000);

    // marca como já exibido
    localStorage.setItem(key, "true");
}

    /* =========================
    COMUNIDADE INIT
    ========================= */
    function carregarDetalheComunidade() {
        const tipo = new URLSearchParams(window.location.search).get("tipo");
        const c = comunidades[tipo];
        if (!c) return;

        document.getElementById("titulo-comunidade").innerText = c.titulo;
        document.getElementById("descricao-comunidade").innerText = c.descricao;

        renderPosts(tipo);
        
        showWelcomeOverlay(tipo);
    }

    /* =========================
    RENDER POSTS (SAFE)
    ========================= */
function renderPosts(tipo) {
    const container = document.getElementById("lista-posts");
    if (!container) return;

    const posts = loadPosts(tipo);

    const searchEl = document.getElementById("search-posts");
    const search = searchEl ? searchEl.value.toLowerCase() : "";

    // 🔥 IMPORTANTE: guardar índice original junto com o post
    const filtered = posts
        .map((p, originalIndex) => ({ ...p, originalIndex }))
        .filter(p => {
            const titulo = (p.titulo || "").toLowerCase();
            const texto = (p.texto || "").toLowerCase();

            return titulo.includes(search) || texto.includes(search);
        });

    container.innerHTML = filtered.map(p => {

        return `
        <div class="post">

            <strong>${p.titulo || "Sem título"}</strong>

            <p>${p.texto || "Sem conteúdo"}</p>

            <small>por ${p.user?.name || "Anônimo"} • ${p.data || ""}</small>

            <div class="post-actions">

                <button onclick="likePost('${tipo}', ${p.originalIndex})">
                    👍 ${p.likes || 0}
                </button>

                <button onclick="toggleComments(${p.originalIndex})">
                    💬 ${(p.comments || []).length}
                </button>

                <button onclick="deletePost('${tipo}', ${p.originalIndex})">
                    ×
                </button>

            </div>

            <div id="comments-${p.originalIndex}" class="comments-box" style="display:none;">
                ${renderComments(p.comments || [])}

                <input id="comment-input-${p.originalIndex}" placeholder="Comentar...">
                <button onclick="addComment('${tipo}', ${p.originalIndex})">Enviar</button>
            </div>

        </div>
        `;
    }).join("");
}
    /* =========================
    CREATE POST (FIXED)
    ========================= */
function criarPost() {
    const tipo = new URLSearchParams(window.location.search).get("tipo");

    const tituloEl = document.getElementById("titulo-post");
    const textoEl = document.getElementById("texto-post");

    const titulo = (tituloEl?.value || "").trim();
    const texto = (textoEl?.value || "").trim();

    if (!titulo || !texto) return;

    const posts = loadPosts(tipo);

    posts.unshift({
        titulo,
        texto,
        user: getUser(),
        likes: 0,
        comments: [],
        data: new Date().toLocaleString()
    });

    savePosts(tipo, posts);

    tituloEl.value = "";
    textoEl.value = "";

    renderPosts(tipo);
}

    /* =========================
    LIKE
    ========================= */
    function likePost(tipo, index) {
        const posts = loadPosts(tipo);

        if (!posts[index]) return;

        posts[index].likes = (posts[index].likes || 0) + 1;

        savePosts(tipo, posts);
        renderPosts(tipo);
    }

    /* =========================
    DELETE
    ========================= */
    function deletePost(tipo, index) {
        const posts = loadPosts(tipo);

        if (!posts[index]) return;

        posts.splice(index, 1);

        savePosts(tipo, posts);
        renderPosts(tipo);
    }

    /* =========================
    COMMENTS
    ========================= */
    function toggleComments(index) {
        const el = document.getElementById(`comments-${index}`);
        if (!el) return;

        el.style.display = el.style.display === "none" ? "block" : "none";
    }

    function addComment(tipo, index) {
        const input = document.getElementById(`comment-input-${index}`);
        if (!input) return;

        const text = input.value.trim();
        if (!text) return;

        const posts = loadPosts(tipo);
        if (!posts[index]) return;

        if (!posts[index].comments) posts[index].comments = [];

        posts[index].comments.push({
            text,
            user: getUser(),
            data: new Date().toLocaleString()
        });

        savePosts(tipo, posts);
        renderPosts(tipo);
    }

    /* =========================
    COMMENTS RENDER
    ========================= */
    function renderComments(comments) {
        if (!comments || !comments.length) {
            return `<small style="opacity:0.6;">Sem comentários ainda</small>`;
        }

        return comments.map(c => `
            <div class="comment">
                <strong>${c.user?.name || "Anon"}:</strong> ${c.text || ""}
            </div>
        `).join("");
    }

    /* =========================
    SEARCH SAFE
    ========================= */
    function filtrarPosts() {
        const tipo = new URLSearchParams(window.location.search).get("tipo");
        renderPosts(tipo);
    }