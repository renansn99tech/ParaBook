document.addEventListener("DOMContentLoaded", () => {

    // =============================
    // TEMA
    // =============================
    const temaSalvo = localStorage.getItem("theme");

    if (temaSalvo === "light") {
        document.body.classList.add("light-mode");
    }

    // =============================
    // ABAS
    // =============================
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

    // =============================
    // BOTÕES
    // =============================

    document.getElementById("btnAlterarSenha")?.addEventListener("click", () => {
        const novaSenha = prompt("Digite sua nova senha:");
        if (!novaSenha) return;
        alert("Senha alterada (simulação)");
    });

    document.getElementById("btnExcluirConta")?.addEventListener("click", () => {
        if (confirm("Tem certeza?")) {
            alert("Conta excluída (simulação)");
        }
    });

    document.getElementById("btnEditarPerfil")?.addEventListener("click", () => {
        const nome = prompt("Novo nome:");
        if (nome) document.getElementById("nomePerfil").textContent = nome;
    });

    document.getElementById("btnEditarBio")?.addEventListener("click", () => {
        const bio = prompt("Nova bio:");
        if (bio) document.querySelector(".bio-text").textContent = bio;
    });

    document.getElementById("btnTrocarFoto")?.addEventListener("click", () => {
        const foto = prompt("URL da foto:");
        if (foto) document.querySelector(".perfil-avatar").src = foto;
    });

    // =============================
    // REMOVER FAVORITOS (delegação)
    // =============================
    document.addEventListener("click", (e) => {
        if (e.target.classList.contains("btn-remover-favorito")) {
            e.target.closest(".favorito-card")?.remove();
        }
    });

    // =============================
    // LOGOUT
    // =============================
    document.getElementById("btnLogout")?.addEventListener("click", () => {
        localStorage.removeItem("usuarioLogado");
        window.location.href = "index.html";
    });

});