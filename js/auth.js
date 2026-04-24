// ===============================
// VERIFICAR TEMA SALVO (INDEX → LOGIN)
// ===============================

window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
    } else {
        document.body.classList.remove("light-mode");
    }
});


const container = document.getElementById("container");
const showRegister = document.getElementById("showRegister");
const showLogin = document.getElementById("showLogin");
const showForgot = document.getElementById("showForgot");
const backToLogin = document.getElementById("backToLogin");

const btnRegister = document.getElementById("btnRegister");
const btnLogin = document.getElementById("btnLogin");

// Banco fake local
let users = JSON.parse(localStorage.getItem("users")) || [];

// Navegação telas
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

// CADASTRO
btnRegister.addEventListener("click", function(){
    const user = document.getElementById("registerUser").value.trim();
    const email = document.getElementById("registerEmail").value.trim();
    const password = document.getElementById("registerPassword").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if(password !== confirmPassword){
        alert("As senhas não coincidem.");
        return;
    }

    const userExists = users.find(u => u.email === email || u.user === user);

    if(userExists){
        alert("Usuário ou e-mail já cadastrado.");
        return;
    }

    users.push({
        user,
        email,
        password
    });

    localStorage.setItem("users", JSON.stringify(users));

    alert("Cadastro realizado com sucesso!");
});

// LOGIN
/*btnLogin.addEventListener("click", function(){
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const user = users.find(
        u => u.email === email && u.password === password
    );

    if(!user){
        alert("E-mail ou senha incorretos.");
        return;
    }

    alert(`Bem-vindo, ${user.user}!`);
});*/

btnLogin.addEventListener("click", function(e){
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    const user = users.find(
        u => u.email === email && u.password === password
    );

    if(!user){
        alert("E-mail ou senha incorretos.");
        return;
    }

    // ✅ SALVA USUÁRIO LOGADO
    localStorage.setItem("usuarioLogado", JSON.stringify(user));

    alert(`Bem-vindo, ${user.user}!`);

    // ✅ REDIRECIONA
    window.location.href = "index.html";
});

// Mostrar senha
// Exibir Senha
/*document.querySelectorAll('.toggle-password').forEach(icon => {
  icon.addEventListener('click', () => {
    let input = document.getElementById(icon.dataset.target);
    let isPassword = input.type === "password";
    input.type = isPassword ? "text" : "password"; // O uso do Operador Ternário é uma ótima oportunidade para ensinar uma forma elegante de escrever if/else.
    icon.classList.toggle('fa-eye');
    icon.classList.toggle('fa-eye-slash');
  });
}); */

// Mostrar senha
document.querySelectorAll(".toggle-password").forEach(button => {
    button.addEventListener("click", function(){
        const targetId = this.getAttribute("data-target");
        const input = document.getElementById(targetId);

        if(input.type === "password"){
            input.type = "text";
            this.textContent = "⊘";
        } else {
            input.type = "password";
            this.textContent = "👁";
        }
    });
});
