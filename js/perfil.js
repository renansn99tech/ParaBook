// Script para as abas
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    // Remove active de todos os botões e conteúdos
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

    // Adiciona active ao clicado
    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');
  });
});

// Preencher dados do perfil (exemplo)
document.getElementById('nomePerfil').textContent = 'João Silva';
document.getElementById('userPerfil').textContent = '@joaosilva';
document.getElementById('totalLidos').textContent = '12';
document.getElementById('emLeitura').textContent = '3';
document.getElementById('totalAvaliados').textContent = '10';
document.getElementById('comunidades').textContent = '5';