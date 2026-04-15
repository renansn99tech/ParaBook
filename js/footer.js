document.getElementById("footer-global").innerHTML = `
        <div id="footer_content">

            <div id="footer-padrao">
                <h1>&copy; ParaBook.</h1>
                <p>O melhor site de livros.</p>

                <div id="footer_social_media">
                    <a href="#" class="footer-link" id="instagram">
                        <i class="fa-brands fa-instagram"></i>
                    </a>

                    <a href="#" class="footer-link" id="facebook">
                        <i class="fa-brands fa-facebook-f"></i>
                    </a>

                    <a href="#" class="footer-link" id="whatsapp">
                        <i class="fa-brands fa-whatsapp"></i>
                    </a>
                </div>

                <p>2026. Todos os direitos reservados.</p>
            </div>

            <div>
                <h3>Conheça nosso Suporte ao Usuário</h3>

                <p>Para dúvidas a respeito do site e problemas na leitura.</p>

                <p><strong>Entre em contato conosco:</strong></p>

                <ul class="footer-list">
                    <li>
                        <a href="#" class="footer-link">
                            Email: parabook@gmail.com
                        </a>
                    </li>
                    <li>
                        <a href="#" class="footer-link">
                            Telefone: (91) 8446-0404
                        </a>
                    </li>
                </ul>

                <p>Segunda a Sexta, 8h às 18h.</p>
            </div>

            <div id="footer_form">
                <h3>Fale Conosco</h3>
                <p>Envie sua mensagem diretamente pelo rodapé.</p>

                <form action="#" method="post" class="contact-form">
                    <label for="footer-name">Nome</label>
                    <input type="text" id="footer-name" class="contact-input">

                    <label for="footer-email">E-mail</label>
                    <input type="email" id="footer-email" class="contact-input">

                    <label for="footer-message">Mensagem</label>
                    <textarea id="footer-message" class="contact-textarea" rows="5"></textarea>

                    <button type="submit" class="contact-btn">
                        Enviar
                    </button>
                </form>
            </div>

            <div id="footer_subscribe">
                <h3>Teve uma experiência ruim?</h3>

                <p>Coloque seu e-mail e a Ouvidoria entrará em contato.</p>

                <div id="input_group">
                    <input type="email" id="feedback-email">
                    <button>
                        <i class="fa-regular fa-envelope"></i>
                    </button>
                </div>
            </div>
        </div>`;