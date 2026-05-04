// Tema
window.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme");
    document.body.classList.toggle("light-mode", savedTheme === "light");
});

const container = document.getElementById("container");

document.getElementById("showRegister").onclick = e => {
    e.preventDefault();
    container.classList.add("active");
    container.classList.remove("forgot-active");
};

document.getElementById("showLogin").onclick = e => {
    e.preventDefault();
    container.classList.remove("active", "forgot-active");
};

document.getElementById("showForgot").onclick = e => {
    e.preventDefault();
    container.classList.add("forgot-active");
    container.classList.remove("active");
};

document.getElementById("backToLogin").onclick = e => {
    e.preventDefault();
    container.classList.remove("forgot-active");
};


//Notify
function notifySuccess(msg) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: msg,
        showConfirmButton: false,
        timer: 2500,
        background: '#111827',
        color: '#E5E7EB'
    });
}

function notifyError(msg) {
    Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'error',
        title: msg,
        showConfirmButton: false,
        timer: 3000,
        background: '#111827',
        color: '#E5E7EB'
    });
}

// Banco fake
let users = JSON.parse(localStorage.getItem("users")) || [];

// Cadastro
document.getElementById("btnRegister").onclick = e => {
    e.preventDefault();

    const user = registerUser.value.trim();
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    const confirm = confirmPassword.value;

    if (password !== confirm) {
        notifyError("As senhas não coincidem");
        return;
    }

    if (users.find(u => u.email === email || u.user === user)) {
        notifyError("Usuário ou e-mail já cadastrado");
        return;
    }

    notifySuccess("Cadastro realizado com sucesso!");
};

// Login
document.getElementById("btnLogin").onclick = e => {
    e.preventDefault();

    const email = loginEmail.value.trim();
    const password = loginPassword.value;

    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
        notifyError("E-mail ou senha inválidos");
        return;
    }

    notifySuccess("Login realizado!");
    setTimeout(() => {
        window.location.href = "index.html";
    }, 1000);

    localStorage.setItem("usuarioLogado", JSON.stringify(user));
    window.location.href = "index.html";
};

// Mostrar senha
document.querySelectorAll(".toggle-password").forEach(btn => {
    btn.onclick = () => {
        const input = document.getElementById(btn.dataset.target);
        input.type = input.type === "password" ? "text" : "password";
    };
});