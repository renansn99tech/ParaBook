import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Alert, StyleSheet, Text, View } from 'react-native';
import { AccessibleAction as TouchableOpacity } from '../components/AccessibleAction';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { bookService } from '../services/bookService';
import { api, getAccessToken } from '../services/api';
import { createRequestEpoch, parseReaderMessage, pdfBytesForReader } from '../services/readerState';

import { buildReaderHtml } from '../services/readerHtml';

type Props = NativeStackScreenProps<RootStackParamList, 'Reader'>;

export const ReaderScreen = ({ route, navigation }: Props) => {
  const { bookId, title } = route.params;
  const webViewRef = useRef<WebView>(null);
  const shelfItemIdRef = useRef<string | number | null>(null);
  const requestEpoch = useRef(createRequestEpoch());
  const requestController = useRef<AbortController | null>(null);
  const pdfEpoch = useRef<number | null>(null);
  const savingRef = useRef(false);
  const currentAccessToken = getAccessToken();
  const [pdfData, setPdfData] = useState<number[] | null>(null);
  const [initialPage, setInitialPage] = useState(1);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [progress, setProgress] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preparingReader, setPreparingReader] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [readerVersion, setReaderVersion] = useState(0);
  const [textMode, setTextMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncError, setSyncError] = useState(false);

  const failReader = useCallback((message: string) => {
    requestEpoch.current.invalidate(); requestController.current?.abort(); pdfEpoch.current = null;
    setPdfData(null); setLoading(false); setErrorMessage(message);
  }, []);

  useEffect(() => {
    if (!currentAccessToken) {
      Alert.alert('Login necessario', 'Entre para acessar o leitor digital.', [
        { text: 'Entrar', onPress: () => navigation.replace('Login') },
      ]);
      return;
    }

    let active = true;
    const epoch = requestEpoch.current.begin();
    const controller = new AbortController();
    requestController.current = controller;
    const current = () => active && requestEpoch.current.isCurrent(epoch);
    setPreparingReader(true);
    setLoading(true); setTextMode(false); setSyncError(false); shelfItemIdRef.current = null; pdfEpoch.current = null;
    setPdfData(null);
    setErrorMessage(null);
    (async () => {
      // Toda abertura passa pela autorização real; o JWT fica no cliente nativo.
      const response = await api.get(`/biblioteca/livros/${bookId}/ler_pdf/`, { responseType: 'arraybuffer', signal: controller.signal });
      if (!current()) return;
      const bytes = pdfBytesForReader(response.data);
      try {
        let item = await bookService.getShelfItemByBook(bookId);
        if (!current()) return;
        if (!item || item.status === 'quero_ler') item = await bookService.updateBookStatus(bookId, 'lendo');
        if (current()) {
          shelfItemIdRef.current = item.id;
          setInitialPage(Math.max(1, item.currentPage));
        }
      } catch {
        if (current()) Alert.alert('Estante não sincronizada', 'A leitura está autorizada. Confira sua estante antes de repetir a alteração.');
      }
      if (current()) { pdfEpoch.current = epoch; setPdfData(bytes); }
    })().catch(() => {
      if (current()) { setLoading(false); setErrorMessage('Livro indisponível ou conexão interrompida. Tente novamente para conferir o acesso.'); }
    }).finally(() => { if (current()) setPreparingReader(false); });

    return () => {
      active = false;
      pdfEpoch.current = null;
      controller.abort(); requestEpoch.current.invalidate();
    };
  }, [bookId, navigation, readerVersion, currentAccessToken]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      requestEpoch.current.invalidate(); requestController.current?.abort();
      pdfEpoch.current = null;
      setPdfData(null);
      if (state === 'active') setReaderVersion((version) => version + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!pdfData || !loading || errorMessage) return;
    const timer = setTimeout(() => {
      failReader('O leitor demorou para iniciar. Confira sua conexão e tente novamente.');
    }, 30000);
    return () => clearTimeout(timer);
  }, [pdfData, loading, errorMessage, failReader]);

  const readerHtml = useMemo(() => {
    if (!pdfData) return '';
    return buildReaderHtml(pdfData, initialPage);
  }, [pdfData, initialPage]);

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
    if (AppState.currentState !== 'active' || pdfEpoch.current === null || !requestEpoch.current.isCurrent(pdfEpoch.current)) return;
    try {
      const message = parseReaderMessage(event.nativeEvent.data);
      if (!message) return;
      if (message.type === 'loaded' || message.type === 'page') {
        if (message.type === 'page') setLoading(false);
        setErrorMessage(null);
        setPage(message.page || 1);
        setTotal(message.total || 0);
        setProgress(message.progress || 0);
        if (message.type === 'page' && message.page && shelfItemIdRef.current) {
          void bookService.updateReadingProgress(shelfItemIdRef.current, message.page).catch(() => {
            setSyncError(true);
          });
        }
      }

      if (message.type === 'error') {
        failReader(message.message);
      }
    } catch {
      failReader('Nao foi possivel interpretar a resposta do leitor.');
    }
  };

  const handleComplete = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await bookService.updateBookStatus(bookId, 'lido');
      Alert.alert('Leitura concluida', 'Livro marcado como lido na sua estante.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Nao sincronizado', 'Tente marcar como lido novamente em instantes.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  if (!currentAccessToken) {
    return <SafeAreaView style={styles.container} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.iconButton}
          accessibilityRole="button" accessibilityLabel="Voltar à obra"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons accessible={false} name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {title || 'Leitura'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Pagina {page}{total ? ` de ${total}` : ''}
          </Text>
        </View>
        <TouchableOpacity style={styles.iconButton} onPress={handleComplete} disabled={saving || loading || Boolean(errorMessage)} accessibilityRole="button" accessibilityLabel="Marcar livro como lido" accessibilityState={{ disabled: saving || loading || Boolean(errorMessage), busy: saving }}>
          <Ionicons accessible={false} name="checkmark-done-outline" size={22} color={colors.accentGreen} />
        </TouchableOpacity>
      </View>

      <View style={styles.progressContainer} accessibilityRole="progressbar" accessibilityLabel="Progresso da leitura" accessibilityValue={{ min: 0, max: 100, now: progress }}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      <View style={styles.readerContainer}>
        {(loading || preparingReader) && (
          <View style={styles.loadingOverlay} accessibilityLabel="Carregando leitura" accessibilityRole="progressbar">
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        )}
        {!errorMessage && !preparingReader && pdfData ? (
          <WebView
            key={readerVersion}
            ref={webViewRef}
            source={{ html: readerHtml }}
            // HTML inline precisa da whitelist ampla; o callback abaixo nega toda navegação externa.
            originWhitelist={['*']}
            javaScriptEnabled
            cacheEnabled={false}
            incognito
            domStorageEnabled={false}
            allowFileAccess={false}
            onShouldStartLoadWithRequest={(request) => request.url === 'about:blank'}
            onMessage={handleMessage}
            onError={() => {
              failReader('Nao foi possivel iniciar o leitor. Verifique sua conexao e tente novamente.');
            }}
            style={styles.webView}
            containerStyle={styles.webViewContainer}
          />
        ) : errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons accessible={false} name="alert-circle-outline" size={42} color={colors.textMuted} />
            <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>{errorMessage}</Text>
            <TouchableOpacity accessibilityRole="button" style={styles.retryButton} onPress={retryReader}>
              <Ionicons accessible={false} name="refresh" size={18} color={colors.textPrimary} />
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel="Texto da página" accessibilityState={{ selected: textMode, disabled: loading || Boolean(errorMessage) }} disabled={loading || Boolean(errorMessage)} style={styles.textToggle} onPress={() => { injectReaderCommand('window.readerToggleText && window.readerToggleText()'); setTextMode(value => !value); }}><Text style={styles.errorText}>{textMode ? 'Mostrar imagem da página' : 'Texto da página'}</Text></TouchableOpacity>

      {syncError && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.errorText}>Progresso não sincronizado. Confira a estante antes de repetir a alteração.</Text>}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          accessibilityRole="button" accessibilityLabel="Página anterior" accessibilityState={{ disabled: loading || Boolean(errorMessage) || page <= 1 }}
          onPress={() => injectReaderCommand('window.readerPreviousPage && window.readerPreviousPage()')}
          disabled={loading || Boolean(errorMessage) || page <= 1}
        >
          <Ionicons accessible={false} name="arrow-back" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        <View style={styles.zoomGroup}>
          <TouchableOpacity
            style={styles.zoomButton}
            accessibilityRole="button" accessibilityLabel="Diminuir zoom" accessibilityState={{ disabled: loading || Boolean(errorMessage) }}
            onPress={() => injectReaderCommand('window.readerZoomOut && window.readerZoomOut()')}
            disabled={loading || Boolean(errorMessage)}
          >
            <Ionicons accessible={false} name="remove" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.zoomButton}
            accessibilityRole="button" accessibilityLabel="Aumentar zoom" accessibilityState={{ disabled: loading || Boolean(errorMessage) }}
            onPress={() => injectReaderCommand('window.readerZoomIn && window.readerZoomIn()')}
            disabled={loading || Boolean(errorMessage)}
          >
            <Ionicons accessible={false} name="add" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.controlButton}
          accessibilityRole="button" accessibilityLabel="Próxima página" accessibilityState={{ disabled: loading || Boolean(errorMessage) || (total > 0 && page >= total) }}
          onPress={() => injectReaderCommand('window.readerNextPage && window.readerNextPage()')}
          disabled={loading || Boolean(errorMessage) || (total > 0 && page >= total)}
        >
          <Ionicons accessible={false} name="arrow-forward" size={20} color={colors.textPrimary} />
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
    width: 44,
    height: 44,
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
    width: 44,
    height: 44,
    borderRadius: 21,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textToggle: { minHeight: 44, padding: 8, backgroundColor: colors.cardBackground, alignItems: 'center', justifyContent: 'center' },
});
