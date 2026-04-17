const comunidades = {
    filosofia: {
        titulo: "Filosofia",
        descricao: "Discussões sobre ideias e pensamentos filosóficos.",
        posts: [
            {
                titulo: "O que é felicidade?",
                texto: "Na visão de Aristóteles, felicidade está ligada à virtude."
            },
            {
                titulo: "Livro recomendado",
                texto: "Meditações, de Marco Aurélio."
            }
        ]
    },

    literatura: {
        titulo: "Literatura",
        descricao: "Discussões sobre livros e autores.",
        posts: [
            {
                titulo: "Dom Casmurro",
                texto: "O que vocês acham do final?"
            }
        ]
    },

    religioso: {
        titulo: "Religiosos",
        descricao: "Reflexões espirituais.",
        posts: [
            {
                titulo: "Versículo do dia",
                texto: "Tudo posso naquele que me fortalece."
            }
        ]
    }
};
    function entrarComunidade(tipo) {
    let salvas = JSON.parse(localStorage.getItem("comunidades")) || [];
    if (!salvas.includes(tipo)) {
        salvas.push(tipo);
        localStorage.setItem("comunidades", JSON.stringify(salvas));
    }
    window.location.href = "acesso-comunidade.html";
    }
    function mostrarComunidadesSalvas() {
    const container = document.getElementById("lista-comunidades-salvas");
    if (!container) return;
    let salvas = JSON.parse(localStorage.getItem("comunidades")) || [];
    if (salvas.length === 0) {
        container.innerHTML = "<p>Você ainda não entrou em nenhuma comunidade.</p>";
        return;
    }
    let html = "";
    salvas.forEach(tipo => {
        const c = comunidades[tipo];
        html += `
    <div class="post">
    <h4>${c.titulo}</h4>
    <p>${c.descricao}</p>
    <a href="conteudo-comunidade.html?tipo=${tipo}" class="btn">
                Acessar
    </a>
    </div>
        `;
    });
    container.innerHTML = html;
    }
    function carregarDetalheComunidade() {
    const titulo = document.getElementById("titulo-comunidade");
    if (!titulo) return;
    const tipo = new URLSearchParams(window.location.search).get("tipo");
    const c = comunidades[tipo];
    if (!c) return;
    titulo.innerText = c.titulo;
    document.getElementById("descricao-comunidade").innerText = c.descricao;
    let html = "";
    c.posts.forEach(post => {
        html += `
    <div class="post">
    <h4>${post.titulo}</h4>
    <p>${post.texto}</p>
    </div>
        `;
    });
    document.getElementById("lista-posts").innerHTML = html;
    }
    document.addEventListener("DOMContentLoaded", () => {
    mostrarComunidadesSalvas();
    carregarDetalheComunidade();
    });