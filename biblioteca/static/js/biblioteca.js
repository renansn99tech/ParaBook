/**
 * Parabook - Módulo de Biblioteca
 * Controle de Filtros e Exclusões Assíncronas via Javascript
 */

document.addEventListener("DOMContentLoaded", function () {
    // Inicializa funções de contagem e escuta aos filtros da estante
    atualizarEstatisticasEstante();
    inicializarFiltrosEstante();
});

/**
 * Filtra dinamicamente os livros na tela de 'Acesso à Biblioteca'
 */
function inicializarFiltrosEstante() {
    const inputBusca = document.getElementById("buscar-livros");
    const selectGenero = document.getElementById("filtro-genero");
    const selectStatus = document.getElementById("filtro-status");

    if (!inputBusca && !selectGenero && !selectStatus) return;

    const executarFiltro = () => {
        const termoBusca = inputBusca ? inputBusca.value.toLowerCase().trim() : "";
        const generoSelecionado = selectGenero ? selectGenero.value.toLowerCase() : "";
        const statusSelecionado = selectStatus ? selectStatus.value.toLowerCase() : "";

        const cards = document.querySelectorAll("#lista-livros .card-livro");
        let encontrados = 0;

        cards.forEach((card) => {
            const titulo = card.querySelector(".book-title")?.textContent.toLowerCase() || "";
            const autor = card.querySelector(".book-author")?.textContent.toLowerCase() || "";
            const generoCard = card.getAttribute("data-genero") || "";
            const statusCard = card.getAttribute("data-status") || "";

            const bateBusca = termoBusca === "" || titulo.includes(termoBusca) || autor.includes(termoBusca);
            const bateGenero = generoSelecionado === "" || generoCard === generoSelecionado;
            const bateStatus = statusSelecionado === "" || statusCard === statusSelecionado;

            if (bateBusca && bateGenero && bateStatus) {
                card.style.display = "";
                encontrados++;
            } else {
                card.style.display = "none";
            }
        });

        // Gerencia estado vazio
        let msgVazia = document.getElementById("empty-state-dinamico");
        if (encontrados === 0) {
            if (!msgVazia) {
                msgVazia = document.createElement("div");
                msgVazia.id = "empty-state-dinamico";
                msgVazia.className = "empty-state col-12 text-center py-5 text-muted";
                msgVazia.innerHTML = '<i class="fa-solid fa-folder-open fs-2 d-block mb-2"></i>Nenhum livro corresponde aos filtros aplicados.';
                document.getElementById("lista-livros").appendChild(msgVazia);
            }
        } else if (msgVazia) {
            msgVazia.remove();
        }
    };

    if (inputBusca) inputBusca.addEventListener("input", executarFiltro);
    if (selectGenero) selectGenero.addEventListener("change", executarFiltro);
    if (selectStatus) selectStatus.addEventListener("change", executarFiltro);
}

/**
 * Processa a remoção de um livro da estante do usuário de forma assíncrona com SweetAlert2
 */
function removerLivroAssincrono(botao, livroId, urlRemocao) {
    // Substituição do confirm nativo pelo SweetAlert2
    Swal.fire({
        title: 'Tem certeza?',
        text: "Você deseja realmente remover este livro da sua coleção?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444', // Vermelho moderno para o botão de deletar
        cancelButtonColor: '#64748b',  // Slate/Cinza para cancelar
        confirmButtonText: 'Sim, remover!',
        cancelButtonText: 'Cancelar',
        background: document.body.classList.contains('light-mode') ? '#ffffff' : '#1e293b',
        color: document.body.classList.contains('light-mode') ? '#0f172a' : '#f8fafc'
    }).then((result) => {
        // Se o usuário confirmou a ação
        if (result.isConfirmed) {
            // Obtém o CSRF Token gerado pelo Django na página
            const csrfTokenInput = document.querySelector('[name=csrfmiddlewaretoken]');
            const csrfToken = csrfTokenInput ? csrfTokenInput.value : "";

            botao.disabled = true;

            fetch(urlRemocao, {
                method: "POST",
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    "X-CSRFToken": csrfToken,
                    "Content-Type": "application/json"
                }
            })
            .then((response) => {
                if (!response.ok) throw new Error("Erro na resposta do servidor.");
                return response.json();
            })
            .then((data) => {
                if (data.success) {
                    const cardLivro = botao.closest(".card-livro");
                    if (cardLivro) {
                        cardLivro.style.transition = "all 0.4s ease";
                        cardLivro.style.opacity = "0";
                        cardLivro.style.transform = "scale(0.8)";
                        
                        setTimeout(() => {
                            cardLivro.remove();
                            atualizarEstatisticasEstante();
                            
                            // Toast de Sucesso do SweetAlert2 (Substituindo o Toastify/Alert)
                            Swal.fire({
                                title: 'Removido!',
                                text: data.message || "Livro removido com sucesso!",
                                icon: 'success',
                                timer: 2000,
                                showConfirmButton: false,
                                background: document.body.classList.contains('light-mode') ? '#ffffff' : '#1e293b',
                                color: document.body.classList.contains('light-mode') ? '#0f172a' : '#f8fafc'
                            });
                        }, 400);
                    }
                } else {
                    Swal.fire({
                        title: 'Erro!',
                        text: data.error || "Ocorreu um erro ao tentar remover o livro.",
                        icon: 'error',
                        confirmButtonColor: '#2563eb'
                    });
                    botao.disabled = false;
                }
            })
            .catch((error) => {
                console.error("Erro na exclusion assíncrona:", error);
                Swal.fire({
                    title: 'Erro de Conexão',
                    text: "Não foi possível conectar ao servidor para remover o livro.",
                    icon: 'error',
                    confirmButtonColor: '#2563eb'
                });
                botao.disabled = false;
            });
        }
    });
}

/**
 * Atualiza dinamicamente os contadores numéricos da interface
 */
function atualizarEstatisticasEstante() {
    const cardsVisíveis = document.querySelectorAll("#lista-livros .card-livro");
    
    let total = 0;
    let concluidos = 0;
    let lendo = 0;

    cardsVisíveis.forEach((card) => {
        total++;
        const status = card.getAttribute("data-status");
        if (status === "lido") concluidos++;
        if (status === "lendo") lendo++;
    });

    const elTotal = document.getElementById("total-livros");
    const elConcluidos = document.getElementById("livros-concluidos");
    const elLendo = document.getElementById("livros-lendo");

    if (elTotal) elTotal.textContent = total;
    if (elConcluidos) elConcluidos.textContent = concluidos;
    if (elLendo) elLendo.textContent = lendo;
};