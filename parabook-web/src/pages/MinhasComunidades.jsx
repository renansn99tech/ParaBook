import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import swal from '../services/swal';
import CardComunidade from '../components/CardComunidade';
import useRevelacao from '../hooks/useRevelacao';
import '../assets/css/comunidade.css';

function MinhasComunidades() {
  const [comunidades, setComunidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [tentativa, setTentativa] = useState(0);
  const [saindo, setSaindo] = useState([]);
  const paginaRef = useRevelacao([comunidades, loading]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setErro('');
    api.get('/comunidades/comunidades/minhas/', { signal: controller.signal })
      .then(res => setComunidades(res.data))
      .catch(err => {
        if (err.code === 'ERR_CANCELED') return;
        console.error("Erro ao carregar suas comunidades:", err);
        setErro('Não foi possível carregar suas comunidades no momento.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [tentativa]);

  const handleSair = async (comunidade) => {
    if (saindo.includes(comunidade.id)) return;
    const confirmacao = await swal.fire({
      icon: 'question',
      title: `Sair de ${comunidade.nome}?`,
      text: 'Você poderá entrar novamente enquanto houver vagas.',
      showCancelButton: true,
      confirmButtonText: 'Sair da comunidade',
      cancelButtonText: 'Cancelar',
    });
    if (!confirmacao.isConfirmed) return;
    setSaindo((atuais) => [...atuais, comunidade.id]);
    try {
      await api.post(`/comunidades/comunidades/${comunidade.id}/entrar/`);
      setComunidades(prev => prev.filter(c => c.id !== comunidade.id));
    } catch (error) {
      console.error("Erro ao sair da comunidade:", error);
      await swal.fire({ icon: 'error', title: 'Não foi possível sair', text: 'Sua participação foi mantida. Tente novamente.' });
    } finally {
      setSaindo((atuais) => atuais.filter((id) => id !== comunidade.id));
    }
  };

  if (loading) {
    return (
      <main className="container py-5 text-center" style={{ minHeight: '60vh' }}>
        <h2 className="text-white-50">Carregando suas comunidades...</h2>
      </main>
    );
  }

  return (
    <main className="container py-4" ref={paginaRef} style={{ minHeight: '60vh' }}>
      <section className="pagina-comunidade">
        <div data-revelar>
          <h1 className="pagina-comunidade-titulo mb-3">
            Minhas Comunidades
          </h1>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '40px' }}>
            Todos os espaços em que você participa, reunidos em um só lugar.
          </p>
        </div>

        {erro && <div className="com-erro" role="alert"><i className="fa-solid fa-cloud-arrow-down" aria-hidden="true"></i><h2>Não foi possível carregar suas comunidades</h2><p>{erro}</p><button type="button" className="btn-primary" onClick={() => setTentativa((valor) => valor + 1)}>Tentar novamente</button></div>}

        {!erro && comunidades.length === 0 ? (
          <div
            data-revelar
            className="com-vazio com-vazio--minhas"
          >
            <i className="fa-solid fa-users-slash" aria-hidden="true"></i>
            <h3>Você ainda não participa de nenhuma comunidade</h3>
            <p className="text-muted mb-4">
              Explore os espaços disponíveis e junte-se a discussões sobre os livros que você ama.
            </p>
            <Link to="/comunidades" className="btn-primary">
              Explorar Comunidades
            </Link>
          </div>
        ) : (
          <div className="grid-comunidades" data-revelar-cascata>
            {comunidades.map((comunidade) => (
              <CardComunidade key={comunidade.id} comunidade={comunidade} data-revelar>
                <Link to={`/comunidade/${comunidade.id}/conteudo`} className="btn-primary flex-grow-1">
                  Acessar
                </Link>
                <button type="button" onClick={() => handleSair(comunidade)} className="btn-ghost" disabled={saindo.includes(comunidade.id)} aria-busy={saindo.includes(comunidade.id)}>
                  {saindo.includes(comunidade.id) ? 'Saindo...' : 'Sair'}
                </button>
              </CardComunidade>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default MinhasComunidades;
