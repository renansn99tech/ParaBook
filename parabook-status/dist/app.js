const ROTULOS_STATUS = {
  concluida: 'Concluída',
  parcial: 'Parcial',
  pendente: 'Pendente',
  indisponivel: 'Temporariamente indisponível',
};

const elementos = {
  corpo: document.querySelector('#matriz-corpo'),
  template: document.querySelector('#linha-template'),
  vazio: document.querySelector('#estado-vazio'),
  busca: document.querySelector('#filtro-busca'),
  status: document.querySelector('#filtro-status'),
  prioridade: document.querySelector('#filtro-prioridade'),
  contagem: document.querySelector('#resultado-contagem'),
};

let quadro = null;

function normalizar(valor) {
  return String(valor || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function preencherResumo(atividades) {
  Object.keys(ROTULOS_STATUS).forEach((status) => {
    const sufixo = status === 'concluida' ? 'concluidas' : status === 'parcial' ? 'parciais' : status === 'pendente' ? 'pendentes' : 'indisponiveis';
    document.querySelector(`#total-${sufixo}`).textContent = atividades.filter((item) => item.status === status).length;
  });
}

function criarLinha(item) {
  const linha = elementos.template.content.firstElementChild.cloneNode(true);
  linha.querySelector('[data-campo="atividade"]').textContent = item.atividade;
  linha.querySelector('[data-campo="area"]').textContent = item.area;
  const status = linha.querySelector('[data-campo="status"]');
  status.textContent = ROTULOS_STATUS[item.status];
  status.dataset.status = item.status;
  linha.querySelector('[data-campo="evidencia"]').textContent = item.evidencia;
  linha.querySelector('[data-campo="proximaAcao"]').textContent = item.proximaAcao;
  linha.querySelector('[data-campo="prioridade"]').textContent = item.prioridade;
  return linha;
}

function renderizarMatriz() {
  const termo = normalizar(elementos.busca.value);
  const status = elementos.status.value;
  const prioridade = elementos.prioridade.value;
  const filtradas = quadro.atividades.filter((item) => {
    const texto = normalizar([item.area, item.atividade, item.evidencia, item.proximaAcao].join(' '));
    return (!termo || texto.includes(termo))
      && (status === 'todos' || item.status === status)
      && (prioridade === 'todas' || item.prioridade === prioridade);
  });

  elementos.corpo.replaceChildren(...filtradas.map(criarLinha));
  elementos.vazio.hidden = filtradas.length > 0;
  elementos.contagem.textContent = `${filtradas.length} de ${quadro.atividades.length} atividades`;
}

function renderizarGates(gates) {
  const lista = document.querySelector('#gates-lista');
  lista.replaceChildren(...gates.map((gate) => {
    const artigo = document.createElement('article');
    artigo.className = 'gate';
    artigo.innerHTML = `
      <span class="gate__id"></span>
      <div><strong></strong><small></small></div>
      <span class="gate__status"></span>
    `;
    artigo.querySelector('.gate__id').textContent = gate.id;
    artigo.querySelector('strong').textContent = gate.nome;
    artigo.querySelector('small').textContent = gate.resumo;
    const estado = artigo.querySelector('.gate__status');
    estado.textContent = gate.status === 'parcial' ? 'Parcial' : 'Aberto';
    estado.dataset.status = gate.status;
    return artigo;
  }));
}

function renderizarPrioridades(prioridades) {
  const lista = document.querySelector('#prioridades-lista');
  lista.replaceChildren(...prioridades.map((prioridade) => {
    const item = document.createElement('li');
    const conteudo = document.createElement('div');
    const titulo = document.createElement('strong');
    const resumo = document.createElement('span');
    titulo.textContent = prioridade.titulo;
    resumo.textContent = prioridade.resumo;
    conteudo.append(titulo, resumo);
    item.append(conteudo);
    return item;
  }));
}

function renderizarHistorico(historico) {
  const lista = document.querySelector('#historico-lista');
  lista.replaceChildren(...historico.map((registro) => {
    const artigo = document.createElement('article');
    const data = document.createElement('time');
    const titulo = document.createElement('h3');
    const resumo = document.createElement('p');
    data.dateTime = registro.data;
    data.textContent = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date(`${registro.data}T12:00:00`));
    titulo.textContent = registro.titulo;
    resumo.textContent = registro.resumo;
    artigo.append(data, titulo, resumo);
    return artigo;
  }));
}

async function iniciar() {
  try {
    const resposta = await fetch('./data/quadro-geral.json', { cache: 'no-store' });
    if (!resposta.ok) throw new Error('Falha ao carregar o quadro.');
    quadro = await resposta.json();
    document.querySelector('#data-revisao').textContent = `Revisado em ${new Intl.DateTimeFormat('pt-BR').format(new Date(`${quadro.revisadoEm}T12:00:00`))}`;
    document.querySelector('#gates-fechados').textContent = quadro.gates.filter((gate) => gate.status === 'concluido').length;
    preencherResumo(quadro.atividades);
    renderizarMatriz();
    renderizarGates(quadro.gates);
    renderizarPrioridades(quadro.prioridades);
    renderizarHistorico(quadro.historico);
  } catch (erro) {
    elementos.contagem.textContent = 'Não foi possível carregar os dados agora.';
    elementos.vazio.hidden = false;
    elementos.vazio.querySelector('strong').textContent = 'Dados temporariamente indisponíveis';
    elementos.vazio.querySelector('span').textContent = 'Tente novamente em alguns instantes.';
  }
}

[elementos.busca, elementos.status, elementos.prioridade].forEach((controle) => controle.addEventListener('input', renderizarMatriz));
document.querySelector('#limpar-filtros').addEventListener('click', () => {
  elementos.busca.value = '';
  elementos.status.value = 'todos';
  elementos.prioridade.value = 'todas';
  elementos.busca.focus();
  renderizarMatriz();
});

iniciar();
