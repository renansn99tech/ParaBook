document.addEventListener("DOMContentLoaded", () => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

    const btnLogin = document.querySelector(".login-btn");
    const perfilLink = document.getElementById("linkPerfil");

    if (usuario) {
        if (btnLogin) btnLogin.style.display = "none";
        if (perfilLink) perfilLink.style.display = "block";
    } else {
        if (btnLogin) btnLogin.style.display = "block";
        if (perfilLink) perfilLink.style.display = "none";
    }

    // ==================================================
    // DARK / LIGHT MODE
    // ==================================================

    const toggleBtn = document.getElementById("theme-toggle");
    const body = document.body;
    const heroImg = document.getElementById("hero-image");

    const darkImage = "img/hero-bg.jpg";
    const lightImage = "img/hero-light-bg.jpg";

    function applyTheme(theme) {
        if (theme === "light") {
            body.classList.add("light-mode");

            if (heroImg) {
                heroImg.src = lightImage;
            }

            if (toggleBtn) {
                toggleBtn.textContent = "🌙";
            }

        } else {
            body.classList.remove("light-mode");

            if (heroImg) {
                heroImg.src = darkImage;
            }

            if (toggleBtn) {
                toggleBtn.textContent = "☀️";
            }
        }
    }

    // ==================================================
    // CARREGA O TEMA SALVO EM TODAS AS PÁGINAS
    // ==================================================

    const savedTheme = localStorage.getItem("theme") || "dark";
    applyTheme(savedTheme);

    // ==================================================
    // BOTÃO TOGGLE (somente existe na index)
    // ==================================================

    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            const isLight = body.classList.contains("light-mode");

            if (isLight) {
                localStorage.setItem("theme", "dark");
                applyTheme("dark");
            } else {
                localStorage.setItem("theme", "light");
                applyTheme("light");
            }
        });
    }
});