const articles = [
    {
        category: "Carreira",
        title: "Guia de Carreira em Tecnologia",
        desc: "Estratégia prática para entrar em TI e conseguir oportunidades reais.",
        time: "10 min",
        level: "Alta relevância"
    },
    {
        category: "Projetos",
        title: "Projetos com JavaScript para Portfólio",
        desc: "Ideias práticas para construir projetos que chamam atenção de recrutadores.",
        time: "15 min",
        level: "Essencial"
    },
    {
        category: "Estudos",
        title: "Como Estudar de Forma Eficiente",
        desc: "Métodos simples para aprender mais rápido e manter consistência.",
        time: "8 min",
        level: "Alta retenção"
    },
    {
        category: "IA",
        title: "IA no Desenvolvimento de Software",
        desc: "Como usar IA para acelerar criação de sistemas reais.",
        time: "12 min",
        level: "Tendência"
    },
    {
        category: "Portfólio",
        title: "Construindo um Portfólio Profissional",
        desc: "Estrutura moderna para destacar projetos e aumentar chances de contratação.",
        time: "9 min",
        level: "Muito importante"
    }
];

const grid = document.querySelector(".grid");

const modal = document.getElementById("modal");
const closeModalBtn = document.getElementById("closeModal");

const modalCategory = document.getElementById("modalCategory");
const modalTitle = document.getElementById("modalTitle");
const modalDesc = document.getElementById("modalDesc");
const modalLevel = document.getElementById("modalLevel");
const modalTime = document.getElementById("modalTime");

// RENDER DOS CARDS
function renderCards() {
    grid.innerHTML = articles.map((item, index) => `
        <article class="card">
            <span class="badge">${item.category}</span>
            <h3>${item.title}</h3>
            <p>${item.desc}</p>

            <div class="meta">
                <span>⚡ ${item.level}</span>
                <span>⏱ ${item.time}</span>
            </div>

            <button class="action" data-index="${index}">Explorar →</button>
        </article>
    `).join("");
}

// ABRIR MODAL
function openModal(index) {
    const item = articles[index];

    modalCategory.textContent = item.category;
    modalTitle.textContent = item.title;
    modalDesc.textContent = item.desc;
    modalLevel.textContent = "⚡ " + item.level;
    modalTime.textContent = "⏱ " + item.time;

    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

// FECHAR MODAL
function closeModal() {
    modal.classList.remove("show");
    document.body.style.overflow = "auto";
}

// CLIQUE NOS CARDS
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".action");
    if (btn) {
        openModal(btn.dataset.index);
    }
});

// BOTÃO FECHAR
closeModalBtn.addEventListener("click", closeModal);

// CLIQUE FORA DA MODAL
modal.addEventListener("click", (e) => {
    if (e.target === modal) {
        closeModal();
    }
});

// TECLA ESC
document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        closeModal();
    }
});

renderCards();