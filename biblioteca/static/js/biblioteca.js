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

    if (favoritos.includes(id)) {
        favoritos = favoritos.filter(f => f !== id);
        mostrarMensagem("Removido dos favoritos", "#ff9800");
    } else {
        favoritos.push(id);
        mostrarMensagem("Adicionado aos favoritos ❤️");
    }

    localStorage.setItem("favoritos", JSON.stringify(favoritos));
}

// =========================
// DARK MODE
// =========================
document.addEventListener("DOMContentLoaded", () => {
    const tema = localStorage.getItem("theme");

    if (tema === "light") {
        document.body.classList.add("light-mode");
    }
});