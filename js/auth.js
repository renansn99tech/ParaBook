// Script para o login
const container = document.getElementById("container");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");
const showForgot = document.getElementById("showForgot");
const backToLogin = document.getElementById("backToLogin");

// Eventos
showRegister.addEventListener("click", function(e){
    e.preventDefault();
    container.classList.remove("forgot-active");
    container.classList.add("active");
});

showLogin.addEventListener("click", function(e){
    e.preventDefault();
    container.classList.remove("active");
    container.classList.remove("forgot-active");
});

showForgot.addEventListener("click", function(e){
    e.preventDefault();
    container.classList.remove("active");
    container.classList.add("forgot-active");
});

backToLogin.addEventListener("click", function(e){
    e.preventDefault();
    container.classList.remove("forgot-active");
});