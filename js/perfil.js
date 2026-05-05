document.addEventListener("DOMContentLoaded", () => {

    /* =========================================
    APLICAR TEMA SALVO
    ========================================= */

    const temaSalvo = localStorage.getItem("theme");

    if (temaSalvo === "light") {
        document.body.classList.add("light-mode");
    } else {
        document.body.classList.remove("light-mode");
    }

    /* =========================================
    FUNCIONAMENTO DAS ABAS
    ========================================= */

    const botoes = document.querySelectorAll(".tab-btn");
    const conteudos = document.querySelectorAll(".tab-content");

    botoes.forEach(btn => {
        btn.addEventListener("click", () => {

            botoes.forEach(b => b.classList.remove("active"));
            conteudos.forEach(c => c.classList.remove("active"));

            btn.classList.add("active");

            const tabId = btn.dataset.tab;
            document.getElementById(tabId).classList.add("active");
        });
    });

    /* =========================================
    DADOS DE EXEMPLO
    ========================================= */

    document.getElementById("nomePerfil").textContent = "João Silva";
    document.getElementById("userPerfil").textContent = "@joaosilva";
    document.getElementById("totalLidos").textContent = "12";
    document.getElementById("emLeitura").textContent = "3";
    document.getElementById("totalAvaliados").textContent = "10";
    document.getElementById("comunidades").textContent = "5";

    /* =========================================
AÇÕES DOS BOTÕES
========================================= */

// Alterar senha
document.getElementById("btnAlterarSenha").addEventListener("click", () => {
    const novaSenha = prompt("Digite sua nova senha:");

    if (!novaSenha) return;

    console.log("Senha alterada:", novaSenha);
    alert("Senha alterada (simulação)");
});

// Excluir conta
document.getElementById("btnExcluirConta").addEventListener("click", () => {
    const confirmacao = confirm("Tem certeza que deseja excluir sua conta?");

    if (confirmacao) {
        console.log("Conta excluída");
        alert("Conta excluída (simulação)");
    }
});

// Trocar nome
document.getElementById("btnEditarPerfil").addEventListener("click", () => {
    const novoNome = prompt("Digite seu novo nome:");

    if (!novoNome) return;

    document.getElementById("nomePerfil").textContent = novoNome;
});

// Trocar bio
document.getElementById("btnEditarBio").addEventListener("click", () => {
    const novaBio = prompt("Digite sua nova bio:");

    if (!novaBio) return;

    document.querySelector(".bio-text").textContent = novaBio;
});

// Trocar foto (simples)
document.getElementById("btnTrocarFoto").addEventListener("click", () => {
    const novaFoto = prompt("Cole a URL da nova foto:");

    if (!novaFoto) return;

    document.querySelector(".perfil-avatar").src = novaFoto;
});

document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn-remover-favorito")) {

        const card = e.target.closest(".favorito-card");

        if (card) {
            card.remove();
        }

    }

    document.addEventListener("DOMContentLoaded", () => {

    // =============================
    // SALVAR PRIVACIDADE
    // =============================
    const btnPrivacidade = document.getElementById("btnSalvarPrivacidade");

    if (btnPrivacidade) {
        btnPrivacidade.addEventListener("click", () => {
            const status = document.getElementById("togglePrivacidade").checked;

            console.log("Privacidade:", status);
            alert("Configuração de privacidade salva!");
        });
    }

    // =============================
    // SALVAR NOTIFICAÇÕES
    // =============================
    const btnNotificacoes = document.getElementById("btnSalvarNotificacoes");

    if (btnNotificacoes) {
        btnNotificacoes.addEventListener("click", () => {
            const status = document.getElementById("toggleNotificacoes").checked;

            console.log("Notificações:", status);
            alert("Configuração de notificações salva!");
        });
    }

});
});
});