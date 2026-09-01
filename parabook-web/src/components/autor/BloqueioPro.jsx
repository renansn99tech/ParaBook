function BloqueioPro() {
  return (
    <section className="pautor-pro content-glass-card" aria-labelledby="pautor-pro-titulo">
      <div className="pautor-pro-preview" inert={true} aria-hidden="true">
        <div className="pautor-pro-heatmap">
          {Array.from({ length: 32 }, (_, indice) => <span key={indice} style={{ '--intensidade': ((indice % 8) + 1) / 9 }} />)}
        </div>
        <div className="pautor-pro-barras">
          {[42, 78, 55, 88, 64, 47, 72].map((altura, indice) => <span key={indice} style={{ height: `${altura}%` }} />)}
        </div>
      </div>
      <div className="pautor-pro-aviso">
        <span className="pautor-pro-icone"><i className="fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i></span>
        <p>ANALYTICS PRO</p>
        <h2 id="pautor-pro-titulo">EM BREVE</h2>
        <span>Estamos preparando métricas avançadas de retenção, horários e desempenho. Sua visão geral gratuita continua disponível normalmente.</span>
      </div>
    </section>
  );
}

export default BloqueioPro;
