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

const gridLivros = document.getElementById("lista-livros");
    if (gridLivros) {
        const cards = gridLivros.querySelectorAll(".card-livro");
        
        // 1. Sincronização Dinâmica de Status vinda do leitor (localStorage)
        cards.forEach(card => {
            const livroId = card.getAttribute("data-id");
            if (livroId) {
                const pagAtual = Number(localStorage.getItem(`pagina_${livroId}`)) || 0;
                const pagTotal = Number(localStorage.getItem(`total_${livroId}`)) || 0;
                
                let novoStatus = "quero_ler"; // Padrão
                
                if (pagAtual > 0 && pagTotal > 0) {
                    if (pagAtual >= pagTotal) {
                        novoStatus = "lido";
                    } else {
                        novoStatus = "lendo";
                    }
                }
                
                // Atualiza o atributo para o filtro funcionar integrado
                card.setAttribute("data-status", novoStatus);
                
                // Atualiza o Badge visual de status interno do card
                const badge = card.querySelector(".status-badge");
                if (badge) {
                    badge.className = `status-badge status-${novoStatus}`;
                    badge.innerText = novoStatus === "lido" ? "Lido" : novoStatus === "lendo" ? "Lendo" : "Quero ler";
                }
            }
        });

        // Re-executa os filtros e contadores com os status atualizados do localStorage
        if (typeof filtrar === "function") {
            filtrar();
            inicializarContadoresEstaticos(cards);
        }
    }
});

// Remoção Assíncrona via AJAX para atualizar a interface imediatamente
function removerLivroAssincrono(button, livroId, urlRemocao) {
    if (!confirm("Deseja realmente remover este livro da sua biblioteca?")) return;

    const card = button.closest(".card-livro");

    // Envia requisição POST respeitando o CSRF token do Django
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || "";

    fetch(urlRemocao, {
        method: "POST",
        headers: {
            "X-CSRFToken": csrfToken,
            "X-Requested-With": "XMLHttpRequest"
        }
    })
    .then(response => {
        if (response.ok || response.redirected) {
            // Efeito visual de sumiço imediato
            card.style.opacity = "0";
            card.style.transform = "scale(0.9)";
            card.style.transition = "all 0.4s ease";

            setTimeout(() => {
                card.remove();

                // Recalcula contadores da tela após exclusão
                const cardsRestantes = document.querySelectorAll(".card-livro");

                if (typeof filtrar === "function") {
                    filtrar();
                    inicializarContadoresEstaticos(cardsRestantes);
                }

                mostrarMensagem("Livro removido com sucesso!", "#e53935");
            }, 400);
        } else {
            mostrarMensagem("Erro ao tentar remover o livro.", "#f44336");
        }
    })
    .catch(err => {
        console.error(err);
        mostrarMensagem("Erro de conexão.", "#f44336");
    });
}
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

document.addEventListener("DOMContentLoaded", () => {
    const inputBusca = document.getElementById("buscar-livros");
    const selectGenero = document.getElementById("filtro-genero");
    const selectStatus = document.getElementById("filtro-status");
    const gridLivros = document.getElementById("lista-livros");

    if (!gridLivros) return;
    const cards = gridLivros.querySelectorAll(".card-livro");

    // 1. Sincronização de Status (Leitor -> Interface) via localStorage
    function sincronizarStatusLocais() {
        cards.forEach(card => {
            const livroId = card.getAttribute("data-id");
            if (livroId) {
                const pagAtual = Number(localStorage.getItem(`pagina_${livroId}`)) || 0;
                const pagTotal = Number(localStorage.getItem(`total_${livroId}`)) || 0;
                
                let novoStatus = card.getAttribute("data-status"); // Mantém o atual se não houver registros
                
                if (pagAtual > 0 && pagTotal > 0) {
                    novoStatus = (pagAtual >= pagTotal) ? "lido" : "lendo";
                } else if (pagAtual === 0 && pagTotal > 0) {
                    novoStatus = "quero_ler";
                }
                
                if (card.getAttribute("data-status") !== novoStatus) {
                    card.setAttribute("data-status", novoStatus);
                    const badge = card.querySelector(".status-badge");
                    if (badge) {
                        badge.className = `status-badge status-${novoStatus}`;
                        badge.innerText = novoStatus === "lido" ? "Lido" : novoStatus === "lendo" ? "Lendo" : "Quero ler";
                        // Pequeno pulo visual controlado indicando alteração de status bem-sucedida
                        badge.style.transform = "scale(1.15)";
                        setTimeout(() => badge.style.transform = "scale(1)", 250);
                    }
                }
            }
        });
    }

    // 2. Sistema Unificado de Filtros com Animações Fluidas
    function aplicarFiltrosEstatisticos() {
        const termo = inputBusca ? inputBusca.value.toLowerCase().trim() : "";
        const generoSelecionado = selectGenero ? selectGenero.value.toLowerCase() : "";
        const statusSelecionado = selectStatus ? selectStatus.value.toLowerCase() : "";

        let ativos = 0;
        let concluidos = 0;
        let lendo = 0;

        cards.forEach(card => {
            const titulo = card.querySelector(".book-title")?.innerText.toLowerCase() || "";
            const autor = card.querySelector(".book-author")?.innerText.toLowerCase() || "";
            const genero = card.getAttribute("data-genero") || "";
            const status = card.getAttribute("data-status") || "";

            // Lógica de correspondência das regras de filtragem
            const bateTexto = titulo.includes(termo) || autor.includes(termo);
            const bateGenero = generoSelecionado === "" || genero === generoSelecionado;
            const bateStatus = statusSelecionado === "" || status === statusSelecionado;

            if (bateTexto && bateGenero && bateStatus) {
                // Remove classe de ocultação aplicando efeito de fade-in controlado por CSS
                card.classList.remove("filtrado-oculto");
                card.style.position = "relative";
                card.style.visibility = "visible";
                ativos++;
                
                if (status === "lido") concluidos++;
                if (status === "lendo") lendo++;
            } else {
                // Adiciona classe ocultando o card com transição suave de escala/opacidade
                card.classList.add("filtrado-oculto");
            }
        });

        // Atualiza os contadores estáticos do topo dinamicamente
        const txtTotal = document.getElementById("total-livros");
        const txtConcluidos = document.getElementById("livros-concluidos");
        const txtLendo = document.getElementById("livros-lendo");

        if (txtTotal) txtTotal.innerText = ativos;
        if (txtConcluidos) txtConcluidos.innerText = concluidos;
        if (txtLendo) txtLendo.innerText = lendo;

        // Trata o Empty State (aviso de nenhum livro encontrado)
        const emptyState = document.getElementById("empty-state");
        if (ativos === 0) {
            if (!emptyState) {
                const msg = document.createElement("div");
                msg.id = "empty-state";
                msg.className = "empty-state";
                msg.innerHTML = `<i class="fa-solid fa-filter-circle-xmark" style="font-size: 2.5rem; color: #94a3b8; margin-bottom: 1rem;"></i><p>Nenhum livro corresponde aos filtros selecionados.</p>`;
                gridLivros.appendChild(msg);
            }
        } else if (emptyState) {
            emptyState.remove();
        }
    }

    // Vincula listeners para monitorar digitação e mudanças nos selects instantaneamente
    if (inputBusca) inputBusca.addEventListener("input", aplicarFiltrosEstatisticos);
    if (selectGenero) selectGenero.addEventListener("change", aplicarFiltrosEstatisticos);
    if (selectStatus) selectStatus.addEventListener("change", aplicarFiltrosEstatisticos);

    // Inicialização da tela
    sincronizarStatusLocais();
    aplicarFiltrosEstatisticos();
});

// 3. Remoção Segura Assíncrona via AJAX corrigida com tratamento JSON
function removerLivroAssincrono(button, livroId, urlRemocao) {
    if (!confirm("Deseja realmente remover este livro da sua biblioteca pessoal?")) return;

    const card = button.closest(".card-livro");
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]')?.value || "";

    fetch(urlRemocao, {
        method: "POST",
        headers: {
            "X-CSRFToken": csrfToken,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/json"
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Executa a animação de sumiço moderna antes de deletar o nó do DOM
            card.style.opacity = "0";
            card.style.transform = "scale(0.8) translateY(20px)";
            
            setTimeout(() => {
                card.remove();
                // Dispara os filtros para recontar os elementos da tela imediatamente
                const gridLivros = document.getElementById("lista-livros");
                if (gridLivros) {
                    const inputBusca = document.getElementById("buscar-livros");
                    inputBusca.dispatchEvent(new Event('input'));
                }
            }, 400);
        } else {
            alert(data.error || "Erro ao tentar processar a remoção.");
        }
    })
    .catch(err => {
        console.error("Falha na comunicação assíncrona:", err);
        alert("Não foi possível conectar ao servidor para remover o item.");
    });
}