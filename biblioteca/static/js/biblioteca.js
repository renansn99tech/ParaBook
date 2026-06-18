// =========================
// TOAST SIMPLES
// =========================
function mostrarMensagem(msg, cor = "#4caf50") {
    Toastify({
        text: msg,
        duration: 3000,
        gravity: "top",
        position: "right",
        backgroundColor: cor
    }).showToast();
}

// =========================
// FAVORITOS (OPCIONAL)
// =========================
function toggleFavorito(id) {
    let favoritos = JSON.parse(localStorage.getItem("favoritos")) || [];

    if (favorites.includes(id)) {
        favoritos = favoritos.filter(f => f !== id);
        mostrarMensagem("Removido dos favoritos", "#ff9800");
    } else {
        favoritos.push(id);
        mostrarMensagem("Adicionado aos favoritos ❤️");
    }

    localStorage.setItem("favoritos", JSON.stringify(favoritos));
}

// =========================
// INICIALIZAÇÃO E FILTROS (DENTRO DO DOMCONTENTLOADED)
// =========================
document.addEventListener("DOMContentLoaded", () => {
    // 1. Manter sua lógica de Dark Mode existente
    const tema = localStorage.getItem("theme");
    if (tema === "light") {
        document.body.classList.add("light-mode");
    }

    // 2. Nova lógica de Filtros para a página de Acesso à Biblioteca
    const inputBusca = document.getElementById("buscar-livros");
    const filtroGenero = document.getElementById("filtro-genero");
    const filtroStatus = document.getElementById("filtro-status");
    const gridLivros = document.getElementById("lista-livros");

    // Só executa o filtro se os elementos existirem na página atual
    if (gridLivros) {
        // Seleciona os cards de livros e o bloco de empty state
        const cards = gridLivros.querySelectorAll(".card-livro");
        const emptyStateBlock = document.getElementById("empty-state");

        function filtrar() {
            const termo = inputBusca ? inputBusca.value.toLowerCase() : "";
            const genero = filtroGenero ? filtroGenero.value.toLowerCase() : "";
            const status = filtroStatus ? filtroStatus.value : "";

            let livrosVisiveis = 0;

            cards.forEach(card => {
                const titulo = card.querySelector("h3") ? card.querySelector("h3").innerText.toLowerCase() : "";
                const autor = card.querySelector("p") ? card.querySelector("p").innerText.toLowerCase() : "";
                
                // Pega os atributos que colocamos nas tags HTML do Django
                const cardGenero = card.getAttribute("data-genero") || "";
                const cardStatus = card.getAttribute("data-status") || "";

                // Regras de validação (se o card passa no filtro ou não)
                const bateTexto = titulo.includes(termo) || autor.includes(termo);
                const bateGenero = genero === "" || cardGenero.includes(genero);
                
                // Correção para o select que usa 'concluido' mas o banco usa 'lido'
                let statusTraduzido = status;
                if (status === "concluido") statusTraduzido = "lido";
                const bateStatus = status === "" || cardStatus === statusTraduzido;

                // Exibe ou oculta o card baseado no resultado
                if (bateTexto && bateGenero && bateStatus) {
                    card.style.display = ""; // Mantém o padrão do CSS (flex, grid, block, etc)
                    livrosVisiveis++;
                } else {
                    card.style.display = "none";
                }
            });

            // Se o usuário filtrar algo e sumir tudo, exibe a mensagem de "Nenhum livro encontrado"
            if (emptyStateBlock) {
                if (livrosVisiveis === 0 && cards.length > 0) {
                    emptyStateBlock.style.display = "block";
                    // Altera temporariamente o texto caso seja apenas um filtro sem resultados
                    const textP = emptyStateBlock.querySelector("p");
                    if (textP) textP.innerText = "Nenhum livro corresponde aos filtros aplicados.";
                } else if (cards.length === 0) {
                    // Se realmente não houver nenhum livro vindo do banco
                    emptyStateBlock.style.display = "block";
                } else {
                    emptyStateBlock.style.display = "none";
                }
            }

            // Atualiza o contador de "Total de Livros" no topo baseado no que está visível
            const totalLivrosContador = document.getElementById("total-livros");
            if (totalLivrosContador) {
                totalLivrosContador.innerText = livrosVisiveis;
            }
        }

        // Ouvintes de eventos (Listeners) para atualizar em tempo real enquanto o usuário digita/muda as opções
        if (inputBusca) inputBusca.addEventListener("input", filtrar);
        if (filtroGenero) filtroGenero.addEventListener("change", filtrar);
        if (filtroStatus) filtroStatus.addEventListener("change", filtrar);

        // Executa uma vez no início para atualizar os contadores de estatísticas
        filtrar();
        inicializarContadoresEstaticos(cards);
    }
});

// =========================
// ATUALIZADOR DE COUNTERS DA VIEW (LENDO, CONCLUÍDOS, DESEJO)
// =========================
function inicializarContadoresEstaticos(cards) {
    let lendo = 0;
    let concluido = 0;
    let desejo = 0;

    cards.forEach(card => {
        const status = card.getAttribute("data-status");
        if (status === "lendo") lendo++;
        if (status === "lido") concluido++;
        if (status === "quero_ler") desejo++;
    });

    if (document.getElementById("livros-lendo")) document.getElementById("livros-lendo").innerText = lendo;
    if (document.getElementById("livros-concluidos")) document.getElementById("livros-concluidos").innerText = concluido;
    if (document.getElementById("livros-desejo")) document.getElementById("livros-desejo").innerText = desejo;
}