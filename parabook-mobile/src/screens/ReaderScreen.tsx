import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { bookService } from '../services/bookService';
import { getAccessToken } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

type ReaderMessage = {
  type: 'loaded' | 'page' | 'error';
  page?: number;
  total?: number;
  progress?: number;
  message?: string;
};

const buildReaderHtml = (pdfUrl: string, accessToken: string, title: string) => `
<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
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
  </style>
</head>
<body>
  <div id="status">Carregando ${title}...</div>
  <main id="reader" aria-label="Leitor digital">
    <canvas id="pageCanvas"></canvas>
  </main>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
  <script>
    const pdfUrl = ${JSON.stringify(pdfUrl)};
    const accessToken = ${JSON.stringify(accessToken)};
    let pdfDoc = null;
    let pageNumber = 1;
    let totalPages = 0;
    let zoom = 1;
    let rendering = false;
    let queuedPage = null;

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
        const response = await fetch(pdfUrl, {
          headers: { Authorization: 'Bearer ' + accessToken }
        });

        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }

        const data = await response.arrayBuffer();
        pdfDoc = await pdfjsLib.getDocument({ data }).promise;
        totalPages = pdfDoc.numPages || 1;
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

    window.addEventListener('resize', function () {
      renderPage(pageNumber);
    });

    loadPdf();
  </script>
</body>
</html>`;

export const ReaderScreen = ({ route, navigation }: Props) => {
  const { bookId, title } = route.params;
  const webViewRef = useRef<WebView>(null);
  const accessToken = getAccessToken();
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readerVersion, setReaderVersion] = useState(0);

  useEffect(() => {
    if (!accessToken) {
      Alert.alert('Login necessario', 'Entre para acessar o leitor digital.', [
        { text: 'Entrar', onPress: () => navigation.replace('Login') },
      ]);
      return;
    }

    bookService.updateBookStatus(bookId, 'lendo').catch(() => {
      Alert.alert('Modo leitura', 'Nao foi possivel sincronizar o status agora.');
    });
  }, [accessToken, bookId, navigation]);

  const readerHtml = useMemo(() => {
    if (!accessToken) return '';
    return buildReaderHtml(bookService.getBookPdfUrl(bookId), accessToken, title || 'Livro');
  }, [accessToken, bookId, title, readerVersion]);

  const retryReader = () => {
    setLoading(true);
    setErrorMessage(null);
    setPage(1);
    setTotal(0);
    setProgress(0);
    setReaderVersion((version) => version + 1);
  };

  const injectReaderCommand = (command: string) => {
    webViewRef.current?.injectJavaScript(`${command}; true;`);
  };

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as ReaderMessage;
      if (message.type === 'loaded' || message.type === 'page') {
        setLoading(false);
        setErrorMessage(null);
        setPage(message.page || 1);
        setTotal(message.total || 0);
        setProgress(message.progress || 0);
      }

      if (message.type === 'error') {
        setLoading(false);
        setErrorMessage(message.message || 'Nao foi possivel abrir o livro.');
      }
    } catch (error) {
      setLoading(false);
      setErrorMessage('Nao foi possivel interpretar a resposta do leitor.');
    }
  };

  const handleComplete = async () => {
    try {
      await bookService.updateBookStatus(bookId, 'lido');
      Alert.alert('Leitura concluida', 'Livro marcado como lido na sua estante.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Nao sincronizado', 'Tente marcar como lido novamente em instantes.');
    }
  };

  if (!accessToken) {
    return <SafeAreaView style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Leitura'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Pagina {page}{total ? ` de ${total}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleComplete}>
          <Ionicons name="checkmark-done-outline" size={22} color={colors.accentGreen} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.readerContainer}>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        {!errorMessage ? (
          <WebView
            key={readerVersion}
            ref={webViewRef}
            source={{ html: readerHtml }}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            onMessage={handleMessage}
            onError={() => {
              setLoading(false);
              setErrorMessage('Nao foi possivel iniciar o leitor. Verifique sua conexao e tente novamente.');
            }}
            style={styles.webView}
            containerStyle={styles.webViewContainer}
          />
        ) : (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={42} color={colors.textMuted} />
            <Text style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={retryReader}>
              <Ionicons name="refresh" size={18} color={colors.textPrimary} />
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => injectReaderCommand('window.readerPreviousPage && window.readerPreviousPage()')}
          disabled={loading || Boolean(errorMessage) || page <= 1}
        >
          <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.zoomGroup}>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => injectReaderCommand('window.readerZoomOut && window.readerZoomOut()')}
            disabled={loading || Boolean(errorMessage)}
          >
            <Ionicons name="remove" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomButton}
            onPress={() => injectReaderCommand('window.readerZoomIn && window.readerZoomIn()')}
            disabled={loading || Boolean(errorMessage)}
          >
            <Ionicons name="add" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={() => injectReaderCommand('window.readerNextPage && window.readerNextPage()')}
          disabled={loading || Boolean(errorMessage) || (total > 0 && page >= total)}
        >
          <Ionicons name="arrow-forward" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12,
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  progressContainer: {
    height: 4,
    backgroundColor: colors.cardBackground,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  readerContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: colors.background,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    backgroundColor: colors.background,
  },
  webViewContainer: {
    backgroundColor: colors.background,
  },
  webView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginTop: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 16,
    marginTop: 20,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.cardBackground,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  zoomButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
