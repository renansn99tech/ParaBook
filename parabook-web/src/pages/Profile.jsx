import { useContext, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/auth-context';
import useRevelacao from '../hooks/useRevelacao';
import api from '../services/api';
import { abrirOnboardingPerfil } from '../services/onboardingPerfil';
import swal, { BOTAO } from '../services/swal';
import userImg from '../assets/img/avatar-padrao-parabook.webp';
import '../assets/css/perfil.css';

let onboardingExibidoPara = null;

const TABS_BASE = [
  { id: 'historico', label: 'Histórico', icon: 'fa-clock-rotate-left' },
  { id: 'info', label: 'Informações', icon: 'fa-circle-info' },
  { id: 'favoritos', label: 'Favoritos', icon: 'fa-heart' },
  { id: 'comunidades', label: 'Comunidades', icon: 'fa-users' },
];

const HISTORICO_TIPOS = {
  livro: { icone: 'fa-book-open' },
  avaliacao: { icone: 'fa-star' },
  comunidade: { icone: 'fa-comments' },
  conquista: { icone: 'fa-trophy' },
};

function useMovimentoReduzido() {
  const [reduzir, setReduzir] = useState(() => (
    typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false
  ));

  useEffect(() => {
    const consulta = window.matchMedia('(prefers-reduced-motion: reduce)');
    const atualizar = (evento) => setReduzir(evento.matches);
    consulta.addEventListener('change', atualizar);
    return () => consulta.removeEventListener('change', atualizar);
  }, []);
  return reduzir;
}

function useContagem(valor, ativo) {
  const numero = Number.isFinite(Number(valor)) ? Number(valor) : 0;
  const [exibido, setExibido] = useState(ativo ? 0 : numero);

  useEffect(() => {
    if (!ativo) {
      setExibido(numero);
      return undefined;
    }
    const inicio = Date.now();
    const intervalo = window.setInterval(() => {
      const progresso = Math.min(1, (Date.now() - inicio) / 1000);
      setExibido(Math.round(numero * (1 - ((1 - progresso) ** 3))));
      if (progresso >= 1) {
        window.clearInterval(intervalo);
        setExibido(numero);
      }
    }, 32);
    return () => {
      window.clearInterval(intervalo);
      setExibido(numero);
    };
  }, [ativo, numero]);
  return exibido;
}

function EstadoVazio({ icone, titulo, texto, acao }) {
  return (
    <div className="content-glass-card full-width perfil-vazio">
      <i className={`fa-solid ${icone}`} aria-hidden="true"></i>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      {acao && <Link to={acao.to} className="btn-primary-action">{acao.label}</Link>}
    </div>
  );
}

function BadgeTipo({ tipo }) {
  const badges = {
    admin: ['badge-admin', 'fa-shield-halved', 'Admin'],
    autor: ['badge-autor', 'fa-feather-pointed', 'Autor'],
    aguardando_aprovacao: ['badge-pendente', 'fa-clock-rotate-left', 'Em análise'],
    leitor: ['badge-leitor', 'fa-book-open', 'Leitor'],
  };
  const [classe, icone, rotulo] = badges[tipo] || badges.leitor;
  return <span className={`badge ${classe}`}><i className={`fa-solid ${icone}`} aria-hidden="true"></i> {rotulo}</span>;
}

function StatCard({ icone, valor, rotulo, onClick, reduzirMovimento }) {
  const contagem = useContagem(valor, !reduzirMovimento);
  return (
    <button type="button" className="stat-glass-card" onClick={onClick}>
      <span className="stat-icon"><i className={`fa-solid ${icone}`} aria-hidden="true"></i></span>
      <span className="stat-info"><strong className="stat-number">{contagem}</strong><span className="stat-label">{rotulo}</span></span>
    </button>
  );
}

function ToastPerfil({ toast }) {
  if (!toast) return null;
  return <div className={`perfil-toast perfil-toast--${toast.tipo}`} role="status"><i className="fa-solid fa-circle-check" aria-hidden="true"></i>{toast.mensagem}</div>;
}

function formatarMembroDesde(data) {
  if (!data) return null;
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(valor);
}

function formatarDataNascimento(data) {
  if (!data) return 'Não informada';
  const partesIso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data);
  const partesBr = /^(\d{2})[/-](\d{2})[/-](\d{4})$/.exec(data);
  const partes = partesIso
    ? [partesIso[3], partesIso[2], partesIso[1]]
    : partesBr?.slice(1);
  if (!partes) return data;
  const [dia, mes, ano] = partes.map(Number);
  const valor = new Date(ano, mes - 1, dia);
  if (valor.getFullYear() !== ano || valor.getMonth() !== mes - 1 || valor.getDate() !== dia) {
    return 'Não informada';
  }
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(valor);
}

function calcularIdade(data) {
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(data || '');
  if (!partes) return null;
  const nascimento = new Date(Number(partes[1]), Number(partes[2]) - 1, Number(partes[3]));
  const hoje = new Date();
  if (nascimento > hoje) return null;
  return hoje.getFullYear() - nascimento.getFullYear() - (
    (hoje.getMonth() + 1 < nascimento.getMonth() + 1)
    || (hoje.getMonth() === nascimento.getMonth() && hoje.getDate() < nascimento.getDate())
      ? 1 : 0
  );
}

function formatarTempoRelativo(data) {
  if (!data) return null;
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return null;
  const minutos = Math.round((valor.getTime() - Date.now()) / 60000);
  const formato = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' });
  if (Math.abs(minutos) < 60) return formato.format(minutos, 'minute');
  const horas = Math.round(minutos / 60);
  if (Math.abs(horas) < 24) return formato.format(horas, 'hour');
  return formato.format(Math.round(horas / 24), 'day');
}

function Profile() {
  const { user, loading, recarregarUsuario } = useContext(AuthContext);
  const [searchParams, setSearchParams] = useSearchParams();
  const [fullProfile, setFullProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [gamificacao, setGamificacao] = useState(null);
  const [historicoAtividade, setHistoricoAtividade] = useState([]);
  const [historicoRecentes, setHistoricoRecentes] = useState({ livros: [], avaliacoes: [] });
  const [carregandoHistorico, setCarregandoHistorico] = useState(true);
  const [adminDados, setAdminDados] = useState(null);
  const [perfilPrivado, setPerfilPrivado] = useState(false);
  const [toast, setToast] = useState(null);
  const [menuInformacoesAberto, setMenuInformacoesAberto] = useState(false);
  const [drawerAtividade, setDrawerAtividade] = useState(null);
  const fotoInputRef = useRef(null);
  const capaInputRef = useRef(null);
  const metaLeituraInputRef = useRef(null);
  const tabRefs = useRef([]);
  const menuInformacoesRef = useRef(null);
  const drawerFecharRef = useRef(null);
  const drawerGatilhoRef = useRef(null);
  const reduzirMovimento = useMovimentoReduzido();
  const adminAutorizado = user?.tipo === 'admin' && Boolean(user?.is_staff || user?.is_superuser);
  const tabs = [
    ...TABS_BASE,
    ...(adminAutorizado ? [{ id: 'moderacao', label: 'Moderação', icon: 'fa-shield-halved' }] : []),
    { id: 'configuracoes', label: 'Configurações', icon: 'fa-gear' },
  ];
  const tabSolicitada = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(() => (
    [...TABS_BASE, { id: 'configuracoes' }].some((tab) => tab.id === tabSolicitada)
      ? tabSolicitada
      : 'info'
  ));
  const paginaRef = useRevelacao([fullProfile, activeTab, loadingProfile]);

  const ajustarMetaLeitura = (direcao) => {
    const input = metaLeituraInputRef.current;
    if (!input) return;
    if (direcao > 0) input.stepUp();
    else input.stepDown();
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };

  useEffect(() => {
    const idsPermitidos = new Set([
      ...TABS_BASE.map((tab) => tab.id),
      ...(adminAutorizado ? ['moderacao'] : []),
      'configuracoes',
    ]);
    setActiveTab(idsPermitidos.has(tabSolicitada) ? tabSolicitada : 'info');
  }, [adminAutorizado, tabSolicitada]);

  useEffect(() => setPerfilPrivado(Boolean(user?.perfil_privado)), [user?.perfil_privado]);
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!menuInformacoesAberto) return undefined;
    const fechar = (evento) => {
      if (evento.key === 'Escape' || !menuInformacoesRef.current?.contains(evento.target)) {
        setMenuInformacoesAberto(false);
      }
    };
    document.addEventListener('keydown', fechar);
    document.addEventListener('pointerdown', fechar);
    return () => {
      document.removeEventListener('keydown', fechar);
      document.removeEventListener('pointerdown', fechar);
    };
  }, [menuInformacoesAberto]);

  useEffect(() => {
    if (!drawerAtividade) return undefined;
    drawerFecharRef.current?.focus();
    const fecharComEscape = (evento) => {
      if (evento.key === 'Escape') {
        setDrawerAtividade(null);
        drawerGatilhoRef.current?.focus();
      }
    };
    document.addEventListener('keydown', fecharComEscape);
    return () => document.removeEventListener('keydown', fecharComEscape);
  }, [drawerAtividade]);

  useEffect(() => {
    if (user?.username) {
      setLoadingProfile(true);
      api.get(`/perfis/${user.username}/`)
        .then((res) => setFullProfile(res.data))
        .catch((err) => console.error('Erro ao carregar perfil completo', err))
        .finally(() => setLoadingProfile(false));
    } else if (!loading) setLoadingProfile(false);
  }, [loading, user?.username]);

  useEffect(() => {
    if (!user?.username) return undefined;
    let ativo = true;
    setCarregandoHistorico(true);
    api.get('/perfis/historico/')
      .then((res) => {
        if (!ativo) return;
        setHistoricoAtividade(res.data?.eventos || []);
        setHistoricoRecentes(res.data?.recentes || { livros: [], avaliacoes: [] });
      })
      .catch((err) => console.error('Erro ao carregar histórico do perfil', err))
      .finally(() => ativo && setCarregandoHistorico(false));

    if (adminAutorizado) {
      Promise.allSettled([
        api.get('/dashboard/estatisticas/'),
        api.get('/dashboard/aprovacoes/'),
        api.get('/dashboard/denuncias/'),
      ]).then(([estatisticas, aprovacoes, denuncias]) => {
        if (!ativo) return;
        setAdminDados({
          estatisticas: estatisticas.status === 'fulfilled' ? estatisticas.value.data.estatisticas : {},
          aprovacoes: aprovacoes.status === 'fulfilled' ? aprovacoes.value.data : { perfis: [], publicacoes: [] },
          denuncias: denuncias.status === 'fulfilled' ? denuncias.value.data : { livros: [], comunidades: [] },
        });
      });
    } else {
      api.get('/gamificacao/meus-stats/')
        .then((res) => ativo && setGamificacao(res.data))
        .catch((err) => console.error('Erro ao carregar gamificação', err));
    }
    return () => { ativo = false; };
  }, [adminAutorizado, user?.username]);

  useEffect(() => {
    if (!user?.username || !user.onboarding_pendente || onboardingExibidoPara === user.username) return;
    onboardingExibidoPara = user.username;
    (async () => {
      const resultado = await abrirOnboardingPerfil({
        nome: user.nome || user.username || '',
        localizacao: user.localizacao || '',
        descricao_perfil: user.descricao_perfil || '',
      });
      try {
        if (resultado.isConfirmed && resultado.value) {
          await api.patch('/perfis/meu-perfil/', resultado.value);
          swal.fire({ icon: 'success', title: 'Perfil atualizado!', timer: 1800, showConfirmButton: false });
        }
      } catch (err) {
        console.error('Erro ao salvar dados do onboarding', err);
        swal.fire({ icon: 'error', title: 'Não foi possível salvar', text: 'Tente novamente pela edição de perfil.' });
      } finally {
        try { await api.post('/perfis/onboarding/adiar/'); } catch (err) { console.error('Erro ao registrar exibição do onboarding', err); }
        if (recarregarUsuario) await recarregarUsuario();
      }
    })();
  }, [user, recarregarUsuario]);

  if (loading || loadingProfile) return <div className="text-center p-5" role="status">Carregando perfil...</div>;
  if (!user) return <Navigate to="/login" replace />;

  const stats = fullProfile?.estatisticas || { total_lidos: 0, lendo_agora: 0, total_avaliados: 0, total_comunidades: 0 };
  const metaLeitura = stats.meta_leitura_anual || 12;
  const lidosAno = stats.lidos_ano || 0;
  const percentualMeta = Math.min(100, Math.round((lidosAno / metaLeitura) * 100));
  const livrosFavoritos = fullProfile?.favoritos?.livros || [];
  const minhasComunidades = fullProfile?.comunidades || [];
  const generosFavoritos = fullProfile?.favoritos?.generos || [];
  const interesses = fullProfile?.interesses || {};
  const generosInteresse = interesses.generos?.length
    ? interesses.generos
    : generosFavoritos.map((nome) => ({ nome, total: null }));
  const comunidadesInteresse = interesses.comunidades || [];
  const recomendacaoInteresse = interesses.recomendacao;
  const ultimoLido = fullProfile?.ultimo_lido?.titulo;
  const leituraAtual = fullProfile?.leitura_em_andamento;
  const membroDesde = formatarMembroDesde(user.date_joined);
  const totalFila = adminDados?.estatisticas?.aprovacoes_pendentes || 0;
  const totalDenuncias = adminDados?.estatisticas?.denuncias_abertas || 0;
  const totalModeracao = totalFila + totalDenuncias;
  const mostrarToast = (mensagem, tipo = 'success') => setToast({ mensagem, tipo, id: Date.now() });
  const trocarAba = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'info' ? {} : { tab }, { replace: true });
  };
  const handleTabKeyDown = (evento, indice) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(evento.key)) return;
    evento.preventDefault();
    const proximo = (indice + (evento.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    trocarAba(tabs[proximo].id);
    tabRefs.current[proximo]?.focus();
  };
  const abrirDrawerAtividade = (evento, tipo) => {
    drawerGatilhoRef.current = evento.currentTarget;
    setDrawerAtividade(tipo);
  };
  const fecharDrawerAtividade = () => {
    setDrawerAtividade(null);
    drawerGatilhoRef.current?.focus();
  };

  const handleCompartilhar = async () => {
    const url = `${window.location.origin}/perfil/${user.username}`;
    try {
      if (navigator.share) await navigator.share({ title: `Perfil de ${user.nome || user.username}`, url });
      else { await navigator.clipboard.writeText(url); mostrarToast('Link do perfil copiado.'); }
    } catch (error) {
      if (error?.name !== 'AbortError') swal.fire({ icon: 'error', title: 'Não foi possível compartilhar', text: 'Tente copiar o endereço novamente.' });
    }
  };

  const handleTrocarFoto = async (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    const tiposImagem = ['image/png', 'image/jpeg', 'image/webp'];
    const valido = arquivo.type ? tiposImagem.includes(arquivo.type) : /\.(png|jpe?g|webp)$/i.test(arquivo.name);
    if (!valido) {
      swal.fire({ icon: 'error', title: 'Formato não suportado', text: 'Envie uma imagem nos formatos PNG, JPG ou WEBP.' });
      evento.target.value = ''; return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      swal.fire({ icon: 'error', title: 'Imagem muito grande', text: 'O limite é 5 MB.' });
      evento.target.value = ''; return;
    }
    const dados = new FormData(); dados.append('foto', arquivo);
    try {
      const resposta = await api.patch('/perfis/meu-perfil/', dados, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFullProfile((atual) => ({ ...atual, perfil: { ...atual?.perfil, foto: resposta.data.foto } }));
      await recarregarUsuario?.(); mostrarToast('Foto de perfil atualizada.');
    } catch (error) {
      console.error('Erro ao trocar foto', error);
      swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível atualizar a foto. Tente novamente.' });
    } finally { evento.target.value = ''; }
  };

  const handleTrocarCapa = async (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024) {
      swal.fire({ icon: 'error', title: 'Imagem inválida', text: 'Envie uma imagem JPG, PNG ou WebP de até 5 MB.' });
      evento.target.value = '';
      return;
    }
    const dados = new FormData();
    dados.append('capa', arquivo);
    try {
      const resposta = await api.patch('/perfis/meu-perfil/', dados, { headers: { 'Content-Type': 'multipart/form-data' } });
      setFullProfile((atual) => ({ ...atual, perfil: { ...atual?.perfil, capa: resposta.data.capa } }));
      mostrarToast('Capa do perfil atualizada.');
    } catch (error) {
      console.error('Erro ao trocar capa', error);
      swal.fire({ icon: 'error', title: 'Erro', text: error.response?.data?.capa?.[0] || 'Não foi possível atualizar a capa.' });
    } finally {
      evento.target.value = '';
    }
  };

  const handleRemoverFoto = async () => {
    const confirmacao = await swal.fire({ title: 'Remover foto?', text: 'Sua foto atual será removida e o avatar voltará para a imagem padrão.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Remover', cancelButtonText: 'Cancelar', confirmButtonColor: BOTAO.perigo, cancelButtonColor: BOTAO.neutro });
    if (!confirmacao.isConfirmed) return;
    try {
      await api.patch('/perfis/meu-perfil/', { foto: null });
      setFullProfile((atual) => ({ ...atual, perfil: { ...atual?.perfil, foto: null } }));
      await recarregarUsuario?.(); mostrarToast('Foto removida.');
    } catch (error) {
      console.error('Erro ao remover foto', error);
      swal.fire({ icon: 'error', title: 'Erro', text: 'Não foi possível remover a foto. Tente novamente.' });
    }
  };

  const handleBiografia = async () => {
    setMenuInformacoesAberto(false);
    const { value: texto } = await swal.fire({ input: 'textarea', inputLabel: 'Sua biografia (até 800 caracteres)', inputPlaceholder: 'Escreva um pouco sobre você...', inputValue: fullProfile?.perfil?.bio || user?.bio || '', inputAttributes: { maxlength: '800' }, inputValidator: (valor) => valor.length > 800 ? 'A biografia deve ter no máximo 800 caracteres.' : undefined, showCancelButton: true, confirmButtonText: 'Salvar', cancelButtonText: 'Cancelar', cancelButtonColor: BOTAO.perigo });
    if (texto === undefined) return;
    try {
      await api.patch('/perfis/meu-perfil/', { bio: texto });
      setFullProfile((atual) => ({ ...atual, perfil: { ...atual?.perfil, bio: texto } }));
      await recarregarUsuario?.(); mostrarToast('Biografia atualizada.');
    } catch { swal.fire({ icon: 'error', title: 'Erro', text: 'Falha ao atualizar biografia.' }); }
  };

  const handleEditarDados = async () => {
    setMenuInformacoesAberto(false);
    const hoje = new Date();
    const hojeIso = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
    const resultado = await swal.fire({
      title: 'Editar dados pessoais',
      html: `<div class="perfil-dados-modal"><label for="perfil-data-nascimento">Data de nascimento</label><input id="perfil-data-nascimento" class="swal2-input" type="date" max="${hojeIso}"><p id="perfil-idade-calculada" class="perfil-dados-modal-idade">A idade será calculada automaticamente.</p><fieldset><legend>Privacidade</legend><label><input id="perfil-ocultar-idade" type="checkbox"> Ocultar idade</label><label><input id="perfil-ocultar-aniversario" type="checkbox"> Ocultar aniversário</label><label><input id="perfil-ocultar-email" type="checkbox"> Ocultar e-mail</label><label class="perfil-dados-modal-todos"><input id="perfil-ocultar-todos" type="checkbox"> Ocultar todos os dados</label></fieldset></div>`,
      showCancelButton: true,
      confirmButtonText: 'Salvar dados',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,
      didOpen: () => {
        const dataInput = document.getElementById('perfil-data-nascimento');
        const idadeTexto = document.getElementById('perfil-idade-calculada');
        const ocultarIdade = document.getElementById('perfil-ocultar-idade');
        const ocultarAniversario = document.getElementById('perfil-ocultar-aniversario');
        const ocultarEmail = document.getElementById('perfil-ocultar-email');
        const ocultarTodos = document.getElementById('perfil-ocultar-todos');
        dataInput.value = user?.data_nascimento || '';
        ocultarIdade.checked = user?.exibir_idade === false;
        ocultarAniversario.checked = user?.exibir_data_nascimento === false;
        ocultarEmail.checked = user?.exibir_email === false;
        ocultarTodos.checked = ocultarIdade.checked && ocultarAniversario.checked && ocultarEmail.checked;
        const atualizarIdade = () => {
          const idade = calcularIdade(dataInput.value);
          idadeTexto.textContent = Number.isInteger(idade) ? `Idade calculada: ${idade} anos` : 'Informe uma data válida para calcular a idade.';
        };
        const sincronizarTodos = () => {
          ocultarTodos.checked = ocultarIdade.checked && ocultarAniversario.checked && ocultarEmail.checked;
        };
        dataInput.addEventListener('input', atualizarIdade);
        [ocultarIdade, ocultarAniversario, ocultarEmail].forEach((campo) => campo.addEventListener('change', sincronizarTodos));
        ocultarTodos.addEventListener('change', () => {
          ocultarIdade.checked = ocultarTodos.checked;
          ocultarAniversario.checked = ocultarTodos.checked;
          ocultarEmail.checked = ocultarTodos.checked;
        });
        atualizarIdade();
      },
      preConfirm: () => ({
        data_nascimento: document.getElementById('perfil-data-nascimento').value || null,
        exibir_idade: !document.getElementById('perfil-ocultar-idade').checked,
        exibir_data_nascimento: !document.getElementById('perfil-ocultar-aniversario').checked,
        exibir_email: !document.getElementById('perfil-ocultar-email').checked,
      }),
    });
    if (!resultado.isConfirmed) return;
    try {
      await api.patch('/perfis/meu-perfil/', resultado.value);
      await recarregarUsuario?.();
      mostrarToast('Dados pessoais atualizados.');
    } catch (error) {
      swal.fire({ icon: 'error', title: 'Não foi possível salvar', text: error.response?.data?.data_nascimento?.[0] || 'Confira os dados e tente novamente.' });
    }
  };

  const handleSalvarPerfil = async (evento) => {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    const data = Object.fromEntries(formData.entries());
    data.perfil_privado = formData.get('perfil_privado') === 'on';
    try {
      await api.patch('/perfis/meu-perfil/', data);
      await recarregarUsuario?.(); mostrarToast('Configurações salvas com sucesso.');
    } catch (error) {
      console.error(error); swal.fire({ icon: 'error', title: 'Ops...', text: 'Erro ao salvar as configurações.' });
    }
  };

  const handleDesfavoritar = async (livro) => {
    if (!livro.estante_id) return;
    const anteriores = livrosFavoritos;
    setFullProfile((atual) => ({ ...atual, favoritos: { ...atual.favoritos, livros: anteriores.filter((item) => item.id !== livro.id) } }));
    try {
      await api.patch(`/biblioteca/estante/${livro.estante_id}/`, { favorito: false });
      mostrarToast('Livro removido dos favoritos.');
    } catch (error) {
      console.error('Erro ao desfavoritar', error);
      setFullProfile((atual) => ({ ...atual, favoritos: { ...atual.favoritos, livros: anteriores } }));
      swal.fire({ icon: 'error', title: 'Não foi possível desfavoritar', text: 'O livro voltou para sua lista.' });
    }
  };

  const statsCards = adminAutorizado ? [
    { icone: 'fa-users', valor: adminDados?.estatisticas?.total_usuarios || 0, rotulo: 'Usuários', tab: 'info' },
    { icone: 'fa-book', valor: adminDados?.estatisticas?.obras_publicadas || 0, rotulo: 'Obras publicadas', tab: 'info' },
    { icone: 'fa-clipboard-check', valor: totalFila, rotulo: 'Aprovações pendentes', tab: 'moderacao' },
    { icone: 'fa-flag', valor: totalDenuncias, rotulo: 'Denúncias abertas', tab: 'moderacao' },
  ] : [
    { icone: 'fa-book-open', valor: stats.total_lidos, rotulo: 'Livros lidos', tab: 'historico' },
    { icone: 'fa-book-reader', valor: stats.lendo_agora, rotulo: 'Lendo agora', tab: 'info' },
    { icone: 'fa-star', valor: stats.total_avaliados, rotulo: 'Avaliados', tab: 'historico' },
    { icone: 'fa-users', valor: stats.total_comunidades, rotulo: 'Comunidades', tab: 'comunidades' },
  ];
  const moderacaoItens = adminAutorizado ? [
    ...(adminDados?.aprovacoes?.perfis || []).map((item) => ({ id: `autor-${item.id}`, itemId: item.id, categoria: 'autor', icone: 'fa-user-check', titulo: `@${item.username}`, detalhe: 'Solicitação de perfil de autor' })),
    ...(adminDados?.aprovacoes?.publicacoes || []).map((item) => ({ id: `publicacao-${item.id}`, itemId: item.id, categoria: 'publicacao', icone: 'fa-file-circle-check', titulo: item.titulo_livro, detalhe: `Publicação de @${item.autor}` })),
    ...(adminDados?.denuncias?.livros || []).map((item) => ({ id: `livro-${item.id}`, itemId: item.id, categoria: 'livro', icone: 'fa-flag', titulo: item.livro, detalhe: item.motivo })),
    ...(adminDados?.denuncias?.comunidades || []).map((item) => ({ id: `comunidade-${item.id}`, itemId: item.id, categoria: 'comunidade', icone: 'fa-users-slash', titulo: item.comunidade, detalhe: item.motivo })),
  ] : [];

  const handleModeracao = async (item, acao) => {
    const resultado = await swal.fire({
      title: acao === 'aprovar' ? 'Confirmar decisão?' : 'Recusar ou arquivar?',
      text: item.categoria === 'livro' && acao === 'aprovar' ? 'A obra será movida para a lixeira.' : item.titulo,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: acao === 'aprovar' ? 'Confirmar' : 'Recusar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: acao === 'aprovar' ? BOTAO.sucesso : BOTAO.perigo,
      cancelButtonColor: BOTAO.neutro,
    });
    if (!resultado.isConfirmed) return;
    try {
      await api.post(`/dashboard/moderacao/${item.categoria}/${item.itemId}/`, { acao });
      setAdminDados((atual) => {
        const novo = structuredClone(atual);
        const mapa = {
          autor: ['aprovacoes', 'perfis'], publicacao: ['aprovacoes', 'publicacoes'],
          livro: ['denuncias', 'livros'], comunidade: ['denuncias', 'comunidades'],
        };
        const [grupo, lista] = mapa[item.categoria];
        novo[grupo][lista] = novo[grupo][lista].filter((registro) => registro.id !== item.itemId);
        const contador = ['autor', 'publicacao'].includes(item.categoria) ? 'aprovacoes_pendentes' : 'denuncias_abertas';
        novo.estatisticas[contador] = Math.max(0, (novo.estatisticas[contador] || 0) - 1);
        return novo;
      });
      mostrarToast('Decisão de moderação registrada.');
    } catch (error) {
      swal.fire({ icon: 'error', title: 'Não foi possível concluir', text: error.response?.data?.detail || 'Atualize a fila e tente novamente.' });
    }
  };

  return (
    <main className="perfil-page perfil-page--proprio" ref={paginaRef}>
      <section className="perfil-header-container" data-revelar>
        <div className={`perfil-cover ${fullProfile?.perfil?.capa ? 'tem-capa-personalizada' : ''}`}>
          {fullProfile?.perfil?.capa && <img className="perfil-cover-imagem" src={fullProfile.perfil.capa} alt="" aria-hidden="true" />}
          {adminAutorizado && totalModeracao > 0 && <span className="perfil-cover-selo">{totalModeracao} itens aguardando decisão</span>}
          {!adminAutorizado && gamificacao?.dias_seguidos > 0 && <span className="perfil-cover-selo">{gamificacao.dias_seguidos} dias seguidos de leitura</span>}
          <input type="file" accept="image/png,image/jpeg,image/webp" ref={capaInputRef} onChange={handleTrocarCapa} hidden />
          <button type="button" className="btn-capa" onClick={() => capaInputRef.current?.click()}><i className="fa-solid fa-image" aria-hidden="true"></i> Trocar capa</button>
        </div>

        <div className="perfil-content-wrapper">
          <div className="perfil-sidebar">
            <div className={`perfil-avatar-box ${gamificacao?.progresso_nivel != null ? 'tem-progresso' : ''}`} style={gamificacao?.progresso_nivel != null ? { '--pf-xp': gamificacao.progresso_nivel } : undefined}>
              {gamificacao?.progresso_nivel != null && <span className="perfil-avatar-anel" aria-hidden="true"></span>}
              <img src={fullProfile?.perfil?.foto || user?.foto || userImg} alt={`Foto de perfil de ${user?.nome || user?.username}`} className="perfil-avatar" decoding="async" width="176" height="176" />
              <input type="file" accept="image/png,image/jpeg,image/webp" ref={fotoInputRef} onChange={handleTrocarFoto} hidden />
              <button type="button" className="avatar-acao avatar-acao--trocar" onClick={() => fotoInputRef.current?.click()} aria-label="Trocar foto de perfil" title="Trocar foto"><i className="fa-solid fa-camera" aria-hidden="true"></i></button>
              {Boolean(user?.foto || fullProfile?.perfil?.foto) && <button type="button" className="avatar-acao avatar-acao--remover" onClick={handleRemoverFoto} aria-label="Remover foto de perfil" title="Remover foto"><i className="fa-solid fa-trash-can" aria-hidden="true"></i></button>}
              <span className="perfil-nivel">{adminAutorizado ? 'Staff' : `Nível ${gamificacao?.nivel || 1}`}</span>
            </div>
          </div>

          <article className="perfil-main-info glass-card">
            <div className="info-header">
              <h1 className="perfil-nome"><span>{user?.nome || 'Usuário'}</span> <BadgeTipo tipo={user?.tipo} /></h1>
              <p className="perfil-username">@{user?.username}{membroDesde && <> · membro desde {membroDesde}</>}</p>
            </div>
            <div className="info-body">
              <p className="perfil-descricao"><i className="fa-solid fa-quote-left" aria-hidden="true"></i> {fullProfile?.perfil?.descricao_perfil || user?.descricao_perfil || 'Uma nova história começa aqui.'}</p>
              <div className="perfil-info-divisor" aria-hidden="true"></div>
              <div className="perfil-chips">
                {(fullProfile?.perfil?.localizacao || user?.localizacao) && <span className="perfil-chip"><i className="fa-solid fa-location-dot" aria-hidden="true"></i><small>Local</small><strong>{fullProfile?.perfil?.localizacao || user.localizacao}</strong></span>}
                <span className={`perfil-chip perfil-chip--ultimo ${ultimoLido ? '' : 'is-empty'}`}><i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><small>Último lido</small><strong>{ultimoLido || 'Nenhuma leitura concluída'}</strong></span>
                {!adminAutorizado && gamificacao?.total_conquistas != null && <span className="perfil-chip"><i className="fa-solid fa-trophy" aria-hidden="true"></i><small>Conquistas</small><strong>{gamificacao.total_conquistas}</strong></span>}
                {adminAutorizado && <span className="perfil-chip"><i className="fa-solid fa-key" aria-hidden="true"></i><small>Permissões</small><strong>{user.is_superuser ? 'Staff + superuser' : 'Staff'}</strong></span>}
              </div>
              {!adminAutorizado && <>
                <div className="perfil-info-divisor perfil-info-divisor--interesses" aria-hidden="true"></div>
                <section className="perfil-interesses" aria-labelledby="perfil-interesses-titulo">
                  <header className="perfil-interesses-cabecalho">
                    <span><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i></span>
                    <div><h2 id="perfil-interesses-titulo">Interesses</h2><p>Um retrato da sua atividade literária.</p></div>
                  </header>
                  <div className="perfil-interesses-grid">
                    <div className="perfil-interesse-bloco">
                      <span className="perfil-interesse-rotulo"><i className="fa-solid fa-layer-group" aria-hidden="true"></i> Gêneros mais acessados</span>
                      {generosInteresse.length > 0 ? <div className="perfil-interesse-tags">{generosInteresse.slice(0, 3).map((genero) => <span key={genero.nome} title={genero.total ? `${genero.total} livros na estante` : undefined}>{genero.nome}{genero.total ? <small>{genero.total}</small> : null}</span>)}</div> : <p className="perfil-interesse-vazio">Sua estante revelará seus gêneros favoritos.</p>}
                    </div>
                    <div className="perfil-interesse-bloco">
                      <span className="perfil-interesse-rotulo"><i className="fa-solid fa-comments" aria-hidden="true"></i> Comunidades em que mais participa</span>
                      {comunidadesInteresse.length > 0 ? <div className="perfil-interesse-comunidades">{comunidadesInteresse.slice(0, 2).map((comunidade) => <Link key={comunidade.id} to={`/comunidade/${comunidade.id}/conteudo`}><span><strong>{comunidade.nome}</strong><small>{comunidade.participacoes > 0 ? `${comunidade.participacoes} ${comunidade.participacoes === 1 ? 'publicação' : 'publicações'}` : 'Comunidade ativa'}</small></span><i className="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></Link>)}</div> : <p className="perfil-interesse-vazio">Participe de conversas para destacar suas comunidades.</p>}
                    </div>
                    <div className="perfil-interesse-bloco perfil-interesse-bloco--recomendacao">
                      <span className="perfil-interesse-rotulo"><i className="fa-solid fa-bookmark" aria-hidden="true"></i> {recomendacaoInteresse?.rotulo || (user?.tipo === 'autor' ? 'Recomendação do Autor' : 'Recomendação do Leitor')}</span>
                      {recomendacaoInteresse ? <Link to={`/livro/${recomendacaoInteresse.id}`} className="perfil-interesse-recomendacao"><span><strong>{recomendacaoInteresse.titulo}</strong><small>{recomendacaoInteresse.criterio}</small></span>{recomendacaoInteresse.nota ? <b><i className="fa-solid fa-star" aria-hidden="true"></i>{recomendacaoInteresse.nota}</b> : <i className="fa-solid fa-arrow-right" aria-hidden="true"></i>}</Link> : <Link to={user?.tipo === 'autor' ? '/publicar' : '/biblioteca'} className="perfil-interesse-cta">{user?.tipo === 'autor' ? 'Publique uma obra para destacá-la' : 'Avalie um livro para recomendá-lo'} <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link>}
                    </div>
                  </div>
                </section>
              </>}
            </div>
            <div className="perfil-acoes-identidade">
              <button type="button" className="btn-compartilhar" onClick={handleCompartilhar} aria-label="Compartilhar perfil" title="Compartilhar perfil"><i className="fa-solid fa-share-nodes" aria-hidden="true"></i></button>
            </div>
          </article>

          <aside className="perfil-painel">
            {adminAutorizado ? <>
              <span className="perfil-painel-kicker">Operação</span><h2>Painel da plataforma</h2>
              <dl className="perfil-painel-metricas"><div><dt>Fila de moderação</dt><dd className="metrica-perigo">{totalModeracao}</dd></div><div><dt>Novos usuários hoje</dt><dd>{adminDados?.estatisticas?.novos_usuarios_hoje || 0}</dd></div><div><dt>Obras publicadas</dt><dd>{adminDados?.estatisticas?.obras_publicadas || 0}</dd></div></dl>
              <Link to="/dashboard" className="btn-primary-action">Central de Comando <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link>
            </> : <>
              <span className="perfil-painel-kicker">Leitura</span><h2>Sua jornada</h2>
              <div className="perfil-meta-anual"><span className="perfil-meta-anel" style={{ '--pf-meta': percentualMeta }}><strong>{percentualMeta}%</strong><small>{lidosAno} de {metaLeitura}</small></span><span className="perfil-meta-copy"><small className="perfil-meta-kicker">Meta anual</small><strong>Leitura em {new Date().getFullYear()}</strong><span className={`perfil-meta-status ${percentualMeta >= 100 ? 'concluida' : ''}`}><i className={`fa-solid ${percentualMeta >= 100 ? 'fa-circle-check' : 'fa-book-open'}`} aria-hidden="true"></i>{percentualMeta >= 100 ? 'Meta concluída!' : `Faltam ${Math.max(0, metaLeitura - lidosAno)} livros`}</span></span></div>
              {gamificacao && <p className="perfil-ritmo"><strong>{gamificacao.xp} XP</strong> · {gamificacao.xp_no_nivel}/{gamificacao.xp_necessario_nivel} para o próximo nível</p>}
              <div className="continuar-lendo"><span>Continuar lendo</span>{leituraAtual ? <><strong>{leituraAtual.titulo}</strong><small>Página {leituraAtual.pagina_atual || 1}{leituraAtual.total_paginas ? ` de ${leituraAtual.total_paginas}` : ''} · {leituraAtual.progresso_percentual || 0}%</small><div className="perfil-leitura-progresso" role="progressbar" aria-label="Progresso de leitura" aria-valuemin="0" aria-valuemax="100" aria-valuenow={leituraAtual.progresso_percentual || 0}><span style={{ width: `${leituraAtual.progresso_percentual || 0}%` }} /></div><Link to={`/leitura/${leituraAtual.id}`} className="btn-primary-action">Retomar Leitura</Link></> : <><p>Escolha sua próxima história e mantenha o ritmo.</p><Link to="/biblioteca" className="btn-primary-action">Retomar Leitura</Link></>}</div>
            </>}
          </aside>
        </div>
      </section>

      <section className="perfil-stats-grid" data-revelar-cascata aria-label="Estatísticas do perfil">
        {statsCards.map((card) => <StatCard key={card.rotulo} {...card} reduzirMovimento={reduzirMovimento} onClick={() => trocarAba(card.tab)} />)}
      </section>

      <section className="perfil-tabs-section" data-revelar>
        <div className="tabs-nav" role="tablist" aria-label="Seções do perfil">
          {tabs.map((tab, indice) => <button key={tab.id} ref={(elemento) => { tabRefs.current[indice] = elemento; }} type="button" id={`tab-${tab.id}`} className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`} role="tab" aria-selected={activeTab === tab.id} aria-controls={`painel-${tab.id}`} tabIndex={activeTab === tab.id ? 0 : -1} onClick={() => trocarAba(tab.id)} onKeyDown={(evento) => handleTabKeyDown(evento, indice)}><span><i className={`fa-solid ${tab.icon}`} aria-hidden="true"></i> {tab.label}</span>{tab.id === 'moderacao' && totalModeracao > 0 && <span className="tab-contador">{totalModeracao}</span>}</button>)}
        </div>

        <div className="tab-content active" id={`painel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`}>
          {activeTab === 'historico' && <section className="historico-perfil content-glass-card" aria-labelledby="historico-perfil-titulo">
            <header className="historico-perfil-cabecalho"><h3 id="historico-perfil-titulo">Atividade recente</h3></header>
            {carregandoHistorico ? <div className="perfil-vazio perfil-vazio--compacto" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><p>Organizando sua linha do tempo...</p></div> : historicoAtividade.length > 0 ? <ol className="historico-perfil-lista">{historicoAtividade.map((evento) => { const meta = HISTORICO_TIPOS[evento.tipo] || HISTORICO_TIPOS.livro; return <li key={evento.id} className={`historico-evento historico-evento--${evento.tipo}`}><Link to={evento.link || '/perfil?tab=historico'}><span className="historico-evento-icone"><i className={`fa-solid ${meta.icone}`} aria-hidden="true"></i></span><span className="historico-evento-conteudo"><strong>{evento.titulo}</strong><time dateTime={evento.data}>{formatarTempoRelativo(evento.data) || 'Registro anterior'}</time></span></Link></li>; })}</ol> : <div className="perfil-vazio"><i className="fa-solid fa-clock-rotate-left" aria-hidden="true"></i><h4>Sua história começa na próxima página</h4><p>Leia, avalie e participe das comunidades para construir sua linha do tempo.</p><Link to="/biblioteca" className="btn-primary-action">Explorar livros</Link></div>}
          </section>}

          {activeTab === 'info' && <div className="perfil-info-grid perfil-info-grid--moderno perfil-info-grid--sobre">
            <article className="content-glass-card full-width perfil-sobre-card">
              <header className="perfil-sobre-cabecalho"><h3>Sobre {(user?.nome || user?.username || 'Usuário').split(' ')[0]}</h3><div ref={menuInformacoesRef} className="perfil-edicao-controle"><button type="button" className="btn-outline perfil-edicao-gatilho" onClick={() => setMenuInformacoesAberto((aberto) => !aberto)} aria-expanded={menuInformacoesAberto} aria-controls="menuEditarInformacoes"><i className="fa-solid fa-pen-to-square" aria-hidden="true"></i> Editar Informações <i className={`fa-solid fa-chevron-${menuInformacoesAberto ? 'up' : 'down'}`} aria-hidden="true"></i></button><div id="menuEditarInformacoes" className={`perfil-edicao-menu ${menuInformacoesAberto ? 'is-open' : ''}`} role="menu" aria-hidden={!menuInformacoesAberto} inert={!menuInformacoesAberto}><button type="button" role="menuitem" onClick={handleBiografia}><i className="fa-solid fa-align-left" aria-hidden="true"></i><span><strong>Editar Biografia</strong><small>Conte sua história em até 800 caracteres.</small></span></button><button type="button" role="menuitem" onClick={handleEditarDados}><i className="fa-solid fa-address-card" aria-hidden="true"></i><span><strong>Editar Dados</strong><small>Nascimento, idade e privacidade.</small></span></button></div></div></header>
              <p className="sobre-texto">{fullProfile?.perfil?.bio || user?.bio || 'Nenhuma biografia informada.'}</p>
              <div className="perfil-sobre-divisor" aria-hidden="true"></div>
              <div className="perfil-dados-pessoais">
                <dl><div><dt><i className="fa-solid fa-cake-candles" aria-hidden="true"></i> Idade</dt><dd>{user?.exibir_idade === false ? 'Privado' : Number.isInteger(user?.idade) ? `${user.idade} anos` : 'Não informada'}</dd></div><div><dt><i className="fa-solid fa-calendar-day" aria-hidden="true"></i> Aniversário</dt><dd>{user?.exibir_data_nascimento === false ? 'Privado' : formatarDataNascimento(user?.data_nascimento)}</dd></div><div><dt><i className="fa-solid fa-envelope" aria-hidden="true"></i> E-mail</dt><dd>{user?.exibir_email === false ? 'Privado' : user?.email || 'Não informado'}</dd></div></dl>
                <nav className="perfil-info-atalhos" aria-label="Atalhos da atividade literária"><button type="button" onClick={(evento) => abrirDrawerAtividade(evento, 'livros')} aria-haspopup="dialog" aria-controls="drawerAtividadePerfil"><i className="fa-solid fa-book-open" aria-hidden="true"></i><span><strong>{stats.total_lidos}</strong> livros lidos</span><i className="fa-solid fa-chevron-right" aria-hidden="true"></i></button><button type="button" onClick={(evento) => abrirDrawerAtividade(evento, 'avaliacoes')} aria-haspopup="dialog" aria-controls="drawerAtividadePerfil"><i className="fa-solid fa-star" aria-hidden="true"></i><span><strong>{stats.total_avaliados}</strong> avaliações</span><i className="fa-solid fa-chevron-right" aria-hidden="true"></i></button></nav>
              </div>
            </article>
          </div>}

          {activeTab === 'favoritos' && (livrosFavoritos.length === 0 ? <EstadoVazio icone="fa-heart-crack" titulo="Ainda não há livros favoritados" texto="Marque um livro com o coração durante a leitura para vê-lo aqui." acao={{ to: '/biblioteca', label: 'Explorar a Biblioteca' }} /> : <div className="favoritos-grid full">{livrosFavoritos.map((livro) => <article key={livro.id} className="favorito-card content-glass-card"><div className={`favorito-capa ${livro.capa ? '' : 'favorito-capa--placeholder'}`}>{livro.capa ? <img src={livro.capa} alt={`Capa do livro ${livro.titulo}`} loading="lazy" decoding="async" width="180" height="250" /> : <span>SEM CAPA</span>}{livro.estante_id && <button type="button" className="favorito-remover" onClick={() => handleDesfavoritar(livro)} aria-label={`Remover ${livro.titulo} dos favoritos`}><i className="fa-solid fa-heart" aria-hidden="true"></i></button>}</div><div className="favorito-info"><h4>{livro.titulo}</h4><p>{livro.autor}</p></div></article>)}</div>)}

          {activeTab === 'comunidades' && (minhasComunidades.length === 0 ? <EstadoVazio icone="fa-users-slash" titulo="Você ainda não participa de comunidades" texto="Entre em um espaço de discussão para acompanhar conversas sobre seus livros favoritos." acao={{ to: '/comunidades', label: 'Explorar Comunidades' }} /> : <div className="comunidades-perfil-grid full">{minhasComunidades.map((comunidade, indice) => <article key={comunidade.id} className="comunidade-perfil-card content-glass-card"><header><span className="comunidade-perfil-icone"><i className={`fa-solid ${['fa-moon', 'fa-feather-pointed', 'fa-compass'][indice % 3]}`} aria-hidden="true"></i></span><div><h4>{comunidade.nome}</h4><small>Membro</small></div></header><p>{comunidade.descricao}</p><footer><span>Comunidade literária</span><Link to={`/comunidade/${comunidade.id}/conteudo`}>Acessar <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link></footer></article>)}</div>)}

          {activeTab === 'moderacao' && adminAutorizado && <div className="content-glass-card moderacao-card"><div className="moderacao-cabecalho"><div><h3>Fila de moderação</h3><p>Decisões transacionais com auditoria e proteção contra processamento duplicado.</p></div><Link to="/dashboard" className="btn-primary-action">Abrir Dashboard</Link></div>{moderacaoItens.length > 0 ? <ul className="moderacao-lista">{moderacaoItens.slice(0, 8).map((item) => <li key={item.id}><i className={`fa-solid ${item.icone}`} aria-hidden="true"></i><span><strong>{item.titulo}</strong><small>{item.detalhe}</small></span><div className="moderacao-acoes"><button type="button" className="admin-btn-mini ok" onClick={() => handleModeracao(item, 'aprovar')}>Aprovar</button><button type="button" className="admin-btn-mini nao" onClick={() => handleModeracao(item, 'recusar')}>Recusar</button></div></li>)}</ul> : <EstadoVazio icone="fa-circle-check" titulo="Fila zerada" texto="Não há itens aguardando revisão neste momento." acao={{ to: '/dashboard', label: 'Ir para o Dashboard' }} />}</div>}

          {activeTab === 'configuracoes' && <div className="configuracoes-perfil-stack">
            <div className="config-container content-glass-card full-width">
              <h2>Configurações da conta</h2>
              <form className="config-form" onSubmit={handleSalvarPerfil}>
                <div className="form-grid">
                  {user?.tipo !== 'admin' && <div className="perfil-form-group full-width perfil-privacidade"><div><h4><i className="fa-solid fa-user-shield" aria-hidden="true"></i> Visibilidade do perfil</h4><p>Ao ativar, seu perfil fica oculto para leitores e autores comuns.</p></div><input type="checkbox" name="perfil_privado" checked={perfilPrivado} readOnly hidden /><button type="button" className="switch-ui" role="switch" aria-checked={perfilPrivado} onClick={() => setPerfilPrivado((valor) => !valor)}><span className="slider-ui"></span><span className="sr-only">Alternar privacidade do perfil</span></button></div>}
                  <div className="perfil-form-group"><label htmlFor="input-nome">Nome de exibição</label><input type="text" id="input-nome" name="nome" className="form-input" defaultValue={user?.nome} /></div>
                  <div className="perfil-form-group"><label htmlFor="input-username">Nome de usuário</label><input type="text" id="input-username" name="username" className="form-input" defaultValue={user?.username} /></div>
                  <div className="perfil-form-group"><label htmlFor="input-descricao">Frase de status</label><input type="text" id="input-descricao" name="descricao_perfil" className="form-input" defaultValue={fullProfile?.perfil?.descricao_perfil || user?.descricao_perfil || ''} /></div>
                  <div className="perfil-form-group"><label htmlFor="input-localizacao">Localização / cidade</label><input type="text" id="input-localizacao" name="localizacao" className="form-input" defaultValue={fullProfile?.perfil?.localizacao || user?.localizacao || ''} /></div>
                  {!adminAutorizado && <div className="perfil-form-group perfil-meta-config"><div className="perfil-meta-config-cabecalho"><span><i className="fa-solid fa-bullseye" aria-hidden="true"></i></span><div><label htmlFor="input-meta-leitura">Meta anual de leitura</label><small>Defina quantos livros você quer concluir neste ano.</small></div></div><div className="perfil-meta-config-controle"><input ref={metaLeituraInputRef} type="number" min="1" max="1000" id="input-meta-leitura" name="meta_leitura_anual" className="form-input" defaultValue={fullProfile?.perfil?.meta_leitura_anual || 12} /><span className="perfil-meta-config-unidade">livros/ano</span><span className="perfil-meta-stepper"><button type="button" onClick={() => ajustarMetaLeitura(1)} aria-label="Aumentar meta anual"><i className="fa-solid fa-chevron-up" aria-hidden="true"></i></button><button type="button" onClick={() => ajustarMetaLeitura(-1)} aria-label="Diminuir meta anual"><i className="fa-solid fa-chevron-down" aria-hidden="true"></i></button></span></div></div>}
                  <div className="perfil-form-group perfil-meta-config perfil-tipografia-config">
                    <div className="perfil-meta-config-cabecalho"><span><i className="fa-solid fa-font" aria-hidden="true"></i></span><div><span className="perfil-tipografia-label">Fonte padrão</span><small>Personalize a tipografia usada em toda a experiência Web.</small></div></div>
                    <div className="perfil-tipografia-atual"><span><small>Padrão atual</small><strong>{user?.tipografia_nome || 'ParaBook Original'}</strong></span><Link to="/perfil/configuracoes/aparencia" className="perfil-tipografia-atalho" aria-label="Abrir configurações avançadas de tipografia">Alterar <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link></div>
                  </div>
                </div>
                <button type="submit" className="btn-primary-action"><i className="fa-solid fa-floppy-disk" aria-hidden="true"></i> Salvar alterações</button>
              </form>
            </div>
            <div className="config-avancado-card content-glass-card"><div className="config-avancado-toggle"><span className="config-avancado-toggle-icone"><i className="fa-solid fa-sliders" aria-hidden="true"></i></span><span className="config-avancado-toggle-texto"><strong>Configurações avançadas</strong><small>{adminAutorizado ? 'Notificações e administração da plataforma.' : 'Preferências de notificações e recursos da conta.'}</small></span><Link to="/perfil/configuracoes" className="config-avancado-toggle-estado">Abrir configurações <i className="fa-solid fa-arrow-right" aria-hidden="true"></i></Link></div></div>
          </div>}
        </div>
      </section>

      <div className={`perfil-atividade-backdrop ${drawerAtividade ? 'is-open' : ''}`} onClick={fecharDrawerAtividade} aria-hidden="true"></div>
      <aside id="drawerAtividadePerfil" className={`perfil-atividade-drawer ${drawerAtividade ? 'is-open' : ''}`} role="dialog" aria-modal="true" aria-hidden={!drawerAtividade} inert={!drawerAtividade} aria-labelledby="drawerAtividadeTitulo">
        <header><span className="perfil-atividade-drawer-icone"><i className={`fa-solid ${drawerAtividade === 'avaliacoes' ? 'fa-star' : 'fa-book-open'}`} aria-hidden="true"></i></span><div><small>Resumo da sua jornada</small><h2 id="drawerAtividadeTitulo">{drawerAtividade === 'avaliacoes' ? 'Últimas avaliações' : 'Últimos livros lidos'}</h2></div><button ref={drawerFecharRef} type="button" onClick={fecharDrawerAtividade} aria-label="Fechar resumo"><i className="fa-solid fa-xmark" aria-hidden="true"></i></button></header>
        <div className="perfil-atividade-drawer-corpo">{carregandoHistorico ? <p role="status">Carregando atividades...</p> : (historicoRecentes[drawerAtividade] || []).length > 0 ? <ol>{historicoRecentes[drawerAtividade].map((evento) => <li key={evento.id}><span><i className={`fa-solid ${drawerAtividade === 'avaliacoes' ? 'fa-star' : 'fa-check'}`} aria-hidden="true"></i></span><div><strong>{evento.titulo}</strong><p>{evento.descricao}</p><time dateTime={evento.data}>{formatarTempoRelativo(evento.data) || 'Registro anterior'}</time></div></li>)}</ol> : <div className="perfil-atividade-drawer-vazio"><i className={`fa-solid ${drawerAtividade === 'avaliacoes' ? 'fa-star-half-stroke' : 'fa-book'}`} aria-hidden="true"></i><strong>Nenhum registro por enquanto</strong><p>Suas próximas atividades aparecerão aqui.</p></div>}</div>
      </aside>

      {user?.tipo === 'autor' && <section data-revelar className="special-panel autor-panel content-glass-card"><div className="panel-info"><h3><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i> Painel do Autor Independente</h3><p>Gerencie suas publicações e compartilhe novas histórias.</p></div><Link to="/publicar" className="btn-primary-action"><i className="fa-solid fa-plus" aria-hidden="true"></i> Publicar novo livro</Link></section>}
      {user?.tipo === 'aguardando_aprovacao' && <section data-revelar className="special-panel pendente-panel content-glass-card"><div className="panel-info"><h3 className="perfil-analise-titulo"><i className="fa-solid fa-hourglass-half" aria-hidden="true"></i> Solicitação em análise</h3><p>Nossa equipe está avaliando seu pedido para se tornar Autor Independente.</p></div></section>}
      {user?.tipo === 'leitor' && <section data-revelar className="special-panel upgrade-panel content-glass-card"><div className="panel-info"><h3>Escreve ou deseja publicar suas próprias obras?</h3><p>Torne-se Autor Independente e comece a compartilhar suas histórias.</p></div><Link to="/autor/onboarding" className="btn-primary-action"><i className="fa-solid fa-feather" aria-hidden="true"></i> Quero ser um Autor</Link></section>}
      <ToastPerfil toast={toast} />
    </main>
  );
}

export default Profile;
