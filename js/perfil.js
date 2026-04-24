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

});