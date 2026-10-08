export const buildReaderHtml = (pdfData: number[], initialPage: number) => `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    html, body {
      margin: 0;
      min-height: 100%;
      background: #070C18;
      color: #FFFFFF;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    #status {
      padding: 18px;
      color: #94A3B8;
      text-align: center;
      font-size: 14px;
    }
    #reader {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px 10px 24px;
      box-sizing: border-box;
      overflow: auto;
    }
    canvas {
      max-width: 100%;
      border-radius: 12px;
      background: #FFFFFF;
      box-shadow: 0 14px 32px rgba(0, 0, 0, 0.35);
    }
    .error {
      color: #f87171;
      line-height: 1.45;
      padding: 24px;
    }
    #pageText { padding: 16px; line-height: 1.7; white-space: pre-wrap; overflow-wrap: anywhere; }
    [hidden] { display: none !important; }
  </style>
</head>
<body>
  <div id="status" role="status">Carregando livro...</div>
  <main id="reader" aria-label="Leitor digital">
    <canvas id="pageCanvas" role="img" aria-label="Imagem da página; texto disponível pelo botão Texto da página"></canvas>
  </main>
  <section id="pageText" hidden aria-label="Texto da página"><h2 id="textTitle"></h2><p id="textContent"></p><small>A ordem depende da estrutura do PDF; imagens não são descritas.</small></section>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    const pdfBytes = ${JSON.stringify(pdfData)};
    let pdfDoc = null;
    let pageNumber = ${initialPage};
    let totalPages = 0;
    let zoom = 1;
    let rendering = false;
    let queuedPage = null;
    let textMode = false;

    function send(payload) {
      window.ReactNativeWebView.postMessage(JSON.stringify(payload));
    }

    function setStatus(text, isError) {
      const status = document.getElementById('status');
      status.textContent = text;
      status.className = isError ? 'error' : '';
    }

    function pagePayload() {
      const progress = totalPages > 0 ? Math.round((pageNumber / totalPages) * 100) : 0;
      return { type: 'page', page: pageNumber, total: totalPages, progress };
    }

    async function renderPage(number) {
      if (!pdfDoc || rendering) {
        queuedPage = number;
        return;
      }

      rendering = true;
      pageNumber = Math.min(Math.max(number, 1), totalPages);

      try {
        const page = await pdfDoc.getPage(pageNumber);
        const canvas = document.getElementById('pageCanvas');
        const context = canvas.getContext('2d');
        const container = document.getElementById('reader');
        const baseViewport = page.getViewport({ scale: 1 });
        const containerWidth = Math.max(container.clientWidth - 20, 260);
        const fittedScale = Math.min(containerWidth / baseViewport.width, 2.2) * zoom;
        const viewport = page.getViewport({ scale: fittedScale });
        const ratio = window.devicePixelRatio || 1;

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = Math.floor(viewport.width) + 'px';
        canvas.style.height = Math.floor(viewport.height) + 'px';
        context.setTransform(ratio, 0, 0, ratio, 0, 0);

        await page.render({ canvasContext: context, viewport }).promise;
        const text = await page.getTextContent();
        document.getElementById('textTitle').textContent = 'Página ' + pageNumber;
        document.getElementById('textContent').textContent = text.items.map(item => typeof item.str === 'string' ? item.str : '').join(' ') || 'Esta página não possui texto extraível. Solicite uma edição acessível pelo suporte.';
        setStatus('', false);
        send(pagePayload());
      } catch (error) {
        setStatus('Nao foi possivel renderizar esta pagina.', true);
        send({ type: 'error', message: 'Falha ao renderizar a pagina.' });
      } finally {
        rendering = false;
        if (queuedPage !== null && queuedPage !== pageNumber) {
          const next = queuedPage;
          queuedPage = null;
          renderPage(next);
        } else {
          queuedPage = null;
        }
      }
    }

    async function loadPdf() {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(pdfBytes), isEvalSupported: false }).promise;
        totalPages = pdfDoc.numPages || 1;
        pageNumber = Math.min(Math.max(pageNumber, 1), totalPages);
        send({ type: 'loaded', page: pageNumber, total: totalPages, progress: 0 });
        renderPage(pageNumber);
      } catch (error) {
        setStatus('Nao foi possivel carregar o PDF deste livro.', true);
        send({ type: 'error', message: 'Falha ao carregar o PDF.' });
      }
    }

    window.readerNextPage = function () {
      if (pageNumber < totalPages) renderPage(pageNumber + 1);
    };

    window.readerPreviousPage = function () {
      if (pageNumber > 1) renderPage(pageNumber - 1);
    };

    window.readerZoomIn = function () {
      zoom = Math.min(zoom + 0.15, 2.4);
      renderPage(pageNumber);
    };

    window.readerZoomOut = function () {
      zoom = Math.max(zoom - 0.15, 0.75);
      renderPage(pageNumber);
    };
    window.readerToggleText = function () {
      textMode = !textMode;
      document.getElementById('reader').hidden = textMode;
      document.getElementById('pageText').hidden = !textMode;
    };

    window.addEventListener('resize', function () {
      renderPage(pageNumber);
    });

    loadPdf();
  </script>
</body>
</html>`;
