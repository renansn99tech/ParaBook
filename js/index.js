document.addEventListener("DOMContentLoaded", () => {
    const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

    const btnLogin = document.querySelector(".login-btn");
    const perfilLink = document.getElementById("linkPerfil");

    if(usuario){
        if(btnLogin) btnLogin.style.display = "none";
        if(perfilLink) perfilLink.style.display = "block";
    } else {
        if(btnLogin) btnLogin.style.display = "block";
        if(perfilLink) perfilLink.style.display = "none";
    }
});