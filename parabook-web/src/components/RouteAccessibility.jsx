import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

const TITULOS = new Map([
  ['/', 'Início'],
  ['/login', 'Entrar'],
  ['/register', 'Criar conta'],
  ['/perfil', 'Meu perfil'],
  ['/perfil/configuracoes', 'Configurações avançadas'],
  ['/biblioteca', 'Biblioteca'],
  ['/comunidades', 'Comunidades'],
  ['/autores', 'Autores'],
  ['/para-leitores', 'Para Leitores'],
  ['/para-autores', 'Para Autores'],
  ['/minhas-publicacoes', 'Minhas publicações'],
  ['/publicar', 'Publicar livro'],
  ['/autor/painel', 'Painel do Autor'],
  ['/minha-biblioteca', 'Minha biblioteca'],
  ['/notificacoes', 'Notificações'],
  ['/planos', 'Planos'],
  ['/minha-assinatura', 'Minha assinatura'],
  ['/ranking', 'Ranking'],
  ['/minhas-conquistas', 'Minhas conquistas'],
  ['/sobre', 'Sobre'],
  ['/diretrizes', 'Diretrizes'],
]);

function tituloDaRota(pathname) {
  if (TITULOS.has(pathname)) return TITULOS.get(pathname);
  if (pathname.startsWith('/livro/')) return 'Detalhes do livro';
  if (pathname.startsWith('/leitura/')) return 'Leitura';
  if (pathname.startsWith('/perfil/configuracoes/')) return 'Configurações da conta';
  if (pathname.startsWith('/perfil/')) return 'Perfil';
  if (pathname.startsWith('/comunidade/')) return 'Comunidade';
  if (pathname.startsWith('/dashboard')) return 'Painel administrativo';
  return 'Página';
}

function RouteAccessibility() {
  const { pathname } = useLocation();
  const primeiraRenderizacao = useRef(true);
  const titulo = tituloDaRota(pathname);

  useEffect(() => {
    document.title = `${titulo} | ParaBook`;

    if (primeiraRenderizacao.current) {
      primeiraRenderizacao.current = false;
      return;
    }

    const conteudo = document.getElementById('conteudo-principal');
    conteudo?.focus({ preventScroll: true });
  }, [pathname, titulo]);

  return (
    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {titulo} carregada
    </p>
  );
}

export default RouteAccessibility;
