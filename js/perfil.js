const perfilHeader = document.getElementById('perfilHeader');
const perfilInfo = document.getElementById('perfilInfo');
const historico = document.getElementById('historico');
const favoritos = document.getElementById('favoritos');

// Função para carregar os dados do perfil
function carregarPerfil() {
    const nome = localStorage.getItem('nome') || 'Usuário';
    const email = localStorage.getItem('email') || 'Não informado';
    const avatar = localStorage.getItem('avatar') || 'img/avatar.png';
    perfilHeader.innerHTML = `
        <img src="${avatar}" alt="Avatar do Usuário" class="avatar">
        <h2 id="nomePerfil">${nome}</h2>
        <p id="userPerfil">${email}</p>
    `;
}

