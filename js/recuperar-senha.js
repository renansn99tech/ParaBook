    function mostrarEtapa(numero) {
    document.querySelectorAll('.etapa').forEach(el => el.classList.remove('active'));
    document.getElementById(`etapa-${numero}`).classList.add('active');
    window.scrollTo(0, 0);
    }

    function recuperarPorEmail(e) {
    e.preventDefault();
    const email = document.getElementById('email-recuperacao').value;
    
    // Simulação - em produção, enviar para o servidor
    console.log('Recuperando por email:', email);
    
    document.getElementById('mensagem-email').style.display = 'block';
    setTimeout(() => {
        mostrarEtapa(5);
    }, 2000);
    }

    function recuperarPorUsuario(e) {
    e.preventDefault();
    const usuario = document.getElementById('usuario-recuperacao').value;
    
    // Simulação - em produção, verificar no servidor
    console.log('Recuperando por usuário:', usuario);
    
    document.getElementById('mensagem-usuario').style.display = 'block';
    }

    function recuperarPorTelefone(e) {
    e.preventDefault();
    const telefone = document.getElementById('telefone-recuperacao').value;
    
    // Simulação - em produção, enviar SMS
    console.log('Enviando SMS para:', telefone);
    
    document.getElementById('mensagem-telefone').style.display = 'block';
    }

    function verificarCodigoSMS() {
    const codigo = document.getElementById('codigo-sms').value;
    
    if (codigo.length === 6) {
        alert('✅ Código verificado com sucesso!');
        mostrarEtapa(5);
    } else {
        alert('❌ Código inválido');
    }
    }

    function togglePassword(inputId) {
    const input = document.getElementById(inputId);
    const icon = event.currentTarget;
    
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.add('fa-eye');
        icon.classList.remove('fa-eye-slash');
    }
    }

    function criarNovaSenha(e) {
    e.preventDefault();
    
    const novaSenha = document.getElementById('nova-senha').value;
    const confirmarSenha = document.getElementById('confirmar-senha').value;
    
    if (novaSenha !== confirmarSenha) {
        alert('❌ As senhas não coincidem!');
        return;
    }
    
    if (!validarSenha(novaSenha)) {
        alert('❌ Senha não atende aos requisitos!');
        return;
    }
    
    // Simulação - em produção, atualizar no servidor
    console.log('Atualizando senha...');
    
    document.getElementById('mensagem-sucesso-final').style.display = 'block';
    }

    function validarSenha(senha) {
    const temMaiuscula = /[A-Z]/.test(senha);
    const temMinuscula = /[a-z]/.test(senha);
    const temNumero = /[0-9]/.test(senha);
    const temCaractereEspecial = /[!@#$%^&*]/.test(senha);
    const temComprimento = senha.length >= 8;
    
    return temMaiuscula && temMinuscula && temNumero && temCaractereEspecial && temComprimento;
    }

    // Validação em tempo real da senha
    document.getElementById('nova-senha')?.addEventListener('input', (e) => {
    const senha = e.target.value;
    
    validarRequisito('req-maiuscula', /[A-Z]/.test(senha));
    validarRequisito('req-minuscula', /[a-z]/.test(senha));
    validarRequisito('req-numero', /[0-9]/.test(senha));
    validarRequisito('req-caractere', /[!@#$%^&*]/.test(senha));
    validarRequisito('req-comprimento', senha.length >= 8);
    });

    function validarRequisito(id, atende) {
    const elemento = document.getElementById(id);
    if (atende) {
        elemento.classList.add('atendido');
        elemento.classList.remove('nao-atendido');
    } else {
        elemento.classList.add('nao-atendido');
        elemento.classList.remove('atendido');
    }
    }