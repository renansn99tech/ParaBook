const articles = [
    {
        category: "Literatura",
        title: "Confissões",
        desc: "Confissões é o título de um livro autobiográfico escrito por Agostinho de Hipona, no qual relata a sua vida antes de se tornar cristão e sua conversão ao catolicismo.",
        time: "60 min",
        level: "Alta relevância"
    },
    {
        category: "Filosofia",
        title: "Filosofia Antiga",
        desc: "Livro sobre Filosofia Antiga, um panorama das principais correntes que moldaram o pensamento ocidental.",
        time: "35 min",
        level: "Essencial"
    },
    {
        category: "Religioso",
        title: "A Divina Comédia",
        desc: "é um poema épico que narra a jornada do próprio Dante.",
        time: "40 min",
        level: "Alta retenção"
    },
    {
        category: "Infantil",
        title: "Pequeno Príncipe",
        desc: "é uma fábula filosófica sobre um piloto perdido no deserto do Saara que conhece um jovem príncipe vindo de um asteroide (B612).",
        time: "30 min",
        level: "Tendência"
    },
    {
        category: "Literatura",
        title: "O Alienista",
        desc: "O médico Simão Bacamarte funda um local em Itaguaí para estudar a loucura.",
        time: "50 min",
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