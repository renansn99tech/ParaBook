import { useState, useEffect, useContext } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import swal from '../services/swal';
import { AuthContext } from '../context/auth-context';
import api from '../services/api';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/comunidade.css';

function CriarComunidade() {
  const { user, loading: carregandoUsuario } = useContext(AuthContext);
  const navigate = useNavigate();

  const [form, setForm] = useState({ nome: '', descricao: '' });
  const [cota, setCota] = useState(null); // { total, limite, pode_criar }
  const [carregandoCota, setCarregandoCota] = useState(true);
  const [erroCota, setErroCota] = useState(false);
  const [tentativaCota, setTentativaCota] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const paginaRef = useRevelacao([carregandoUsuario, user, carregandoCota]);

  // A cota vem da API para não duplicar a REGRA 10 (limite de 5) no cliente.
  useEffect(() => {
    if (!user) return undefined;

    const controller = new AbortController();
    setCarregandoCota(true);
    setErroCota(false);
    api.get('/comunidades/comunidades/criadas_por_mim/', { signal: controller.signal })
      .then(res => setCota(res.data))
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return;
        console.error("Erro ao verificar suas comunidades:", err);
        setErroCota(true);
      })
      .finally(() => { if (!controller.signal.aborted) setCarregandoCota(false); });
    return () => controller.abort();
  }, [user, tentativaCota]);

  useEffect(() => {
    const alterado = Boolean(form.nome.trim() || form.descricao.trim());
    const avisarSaida = (evento) => {
      if (!alterado || enviando) return;
      evento.preventDefault();
      evento.returnValue = '';
    };
    window.addEventListener('beforeunload', avisarSaida);
    return () => window.removeEventListener('beforeunload', avisarSaida);
  }, [enviando, form.descricao, form.nome]);

  if (carregandoUsuario) {
    return <div className="text-center mt-5"><h2 style={{ color: 'var(--text)' }}>Carregando...</h2></div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // REGRA 5: administradores criam salas oficiais pelo Dashboard, não por aqui.
  if (user.is_superuser) {
    return (
      <main className="container py-5 painel-page" ref={paginaRef}>
        <div className="row justify-content-center">
          <div className="col-lg-6 text-center">
            <div className="surface-card" data-revelar>
              <div className="card-body p-5">
                <i className="fa-solid fa-shield-halved fs-1 mb-3 text-warning"></i>
                <h3 className="fw-bold mb-3">Área destinada a leitores e autores</h3>
                <p className="page-lead mb-4">
                  Administradores criam salas oficiais pelo Dashboard, com lotação e moderação próprias.
                </p>
                <Link to="/dashboard" className="btn-primary">
                  Ir para o Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const atingiuLimite = cota && !cota.pode_criar;

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (enviando) return;
    if (!form.nome.trim() || !form.descricao.trim()) {
      await swal.fire({ icon: 'warning', title: 'Complete os campos', text: 'Nome e descrição não podem conter apenas espaços.' });
      return;
    }
    setEnviando(true);

    try {
      const res = await api.post('/comunidades/comunidades/', {
        nome: form.nome.trim(),
        descricao: form.descricao.trim()
      });

      await swal.fire({
        icon: 'success',
        title: 'Comunidade criada!',
        text: `"${res.data.nome}" já está disponível e você é o primeiro membro.`
      });

      navigate(`/comunidade/${res.data.id}/conteudo`);
    } catch (error) {
      console.error("Erro ao criar comunidade:", error);
      const dados = error.response?.data;
      // O limite de 5 comunidades chega como ValidationError do DRF.
      const mensagem = dados?.detail
        || Object.values(dados || {}).flat()[0]
        || 'Não foi possível criar a comunidade. Tente novamente.';

      swal.fire({ icon: 'error', title: 'Ops', text: mensagem});
      setEnviando(false);
    }
  };

  return (
    <main className="container py-5 painel-page com-criar-page" ref={paginaRef}>
      <div className="row justify-content-center">
        <div className="col-lg-7">
          <div className="surface-card com-criar-card" data-revelar>
            <div className="card-body p-4 p-md-5">
              <div className="text-center mb-4">
                <i className="fa-solid fa-circle-plus surface-icon"></i>
                <h2 className="fw-bold mb-2">Criar Comunidade</h2>
                <p className="page-lead mb-0">
                  Abra um novo espaço de discussão para os livros e temas que você ama.
                </p>
              </div>

              {!carregandoCota && cota && (
                <div className="alert alert-secondary bg-transparent border-secondary text-white-50 py-2 small text-center">
                  Você já criou <strong className="text-white">{cota.total}</strong> de{' '}
                  <strong className="text-white">{cota.limite}</strong> comunidades permitidas.
                </div>
              )}

              {erroCota && (
                <div className="com-cota-erro" role="alert">
                  <span>Não foi possível consultar seu limite agora. A API ainda validará a criação com segurança.</span>
                  <button type="button" onClick={() => setTentativaCota((valor) => valor + 1)}>Tentar novamente</button>
                </div>
              )}

              {atingiuLimite ? (
                <div className="text-center py-3">
                  <div className="alert alert-warning">
                    Você atingiu o limite de {cota.limite} comunidades criadas.
                    Exclua uma existente para abrir espaço.
                  </div>
                  <Link to="/minhas-comunidades" className="btn-ghost">
                    Ver Minhas Comunidades
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="mb-3">
                    <label htmlFor="nome" className="form-label">Nome da comunidade</label>
                    <input
                      id="nome"
                      name="nome"
                      type="text"
                      className="form-control form-control-lg rounded-3"
                      value={form.nome}
                      onChange={handleChange}
                      maxLength={100}
                      placeholder="Ex.: Clube da Ficção Científica"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="descricao" className="form-label">Descrição</label>
                    <textarea
                      id="descricao"
                      name="descricao"
                      className="form-control rounded-3"
                      value={form.descricao}
                      onChange={handleChange}
                      placeholder="Explique sobre o que é a comunidade e quem deveria participar."
                      maxLength={1200}
                      rows={6}
                      aria-describedby="descricao-ajuda"
                      required
                    />
                    <small id="descricao-ajuda" className="com-campo-ajuda">{form.descricao.length}/1200 caracteres</small>
                  </div>

                  <div className="d-flex flex-wrap gap-3 justify-content-end">
                    <Link to="/comunidades" className="btn-ghost">
                      Cancelar
                    </Link>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={enviando}
                      aria-busy={enviando}
                    >
                      <i className="fa-solid fa-plus me-2"></i>
                      {enviando ? 'Criando...' : 'Criar Comunidade'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default CriarComunidade;
