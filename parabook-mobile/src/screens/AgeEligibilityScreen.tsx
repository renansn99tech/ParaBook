import React, { useRef, useState } from 'react';
import { Alert, Linking, ScrollView, Share, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { ageService } from '../services/ageService';
import { api, API_BASE_URL } from '../services/api';
import { extractApiErrorMessage } from '../services/authService';
import { colors } from '../theme/colors';

const publicWebUrl = process.env.EXPO_PUBLIC_WEB_URL?.trim().replace(/\/+$/, '');
const privacyUrl = publicWebUrl && /^https?:\/\//i.test(publicWebUrl) ? `${publicWebUrl}/privacidade` : null;

export const AgeEligibilityScreen = () => {
  const { eligibility, refreshUser, logout } = useAuth();
  const [birthDate, setBirthDate] = useState('');
  const attemptKey = useRef<string | null>(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [books, setBooks] = useState<Array<{ id: number; titulo: string; acesso: { pode_ler_amostra: boolean } }>>([]);
  const exportData = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.get('/auth/exportar-dados/');
      await Share.share({ title: 'Meus dados ParaBook', message: JSON.stringify(data, null, 2) });
    } catch (failure) { setError(extractApiErrorMessage(failure, 'Exportação indisponível. Solicite atendimento assistido.')); }
    finally { setBusy(false); }
  };
  const closeAccount = () => {
    if (busy || !password) return;
    Alert.alert('Encerrar conta', 'O acesso será encerrado agora. O descarte seguirá os prazos de privacidade; provas mínimas e cópias têm tratamento separado.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Encerrar', style: 'destructive', onPress: () => void (async () => {
        setBusy(true); setError('');
        try {
          await api.delete('/auth/excluir-conta/', { data: { senha_atual: password } });
          setPassword('');
          await logout();
        } catch (failure) { setError(extractApiErrorMessage(failure, 'Não foi possível encerrar a conta.')); }
        finally { setBusy(false); }
      })() },
    ]);
  };
  const loadCatalog = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.get('/biblioteca/livros/');
      setBooks(Array.isArray(data) ? data : data.results || []);
    } catch (failure) { setError(extractApiErrorMessage(failure, 'Catálogo indisponível.')); }
    finally { setBusy(false); }
  };
  const declare = async () => {
    if (busy || !eligibility) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setError('Informe a data no formato AAAA-MM-DD.');
      return;
    }
    Alert.alert('Confirmar declaração', 'Confirmo que a data informada está correta.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Confirmar', onPress: () => void (async () => {
        setBusy(true); setError('');
        try {
          // Preserva a tentativa mesmo se AppState/refresh trouxer uma nova chave.
          attemptKey.current ||= eligibility.chave_declaracao;
          await ageService.declare(birthDate, attemptKey.current);
          attemptKey.current = null;
          setBirthDate('');
          await refreshUser();
        } catch (failure) { setError(extractApiErrorMessage(failure, 'Declaração não registrada. Tente novamente.')); }
        finally { setBusy(false); }
      })() },
    ]);
  };
  const support = async () => {
    if (busy || !message.trim()) return;
    setBusy(true); setError('');
    try {
      const { data } = await api.post('/auth/suporte/', { categoria: 'idade', assunto: 'Revisão de elegibilidade etária', mensagem: message.trim() });
      setMessage('');
      Alert.alert('Solicitação registrada', `Protocolo: ${data.protocolo}. O recebimento não representa decisão.`);
    } catch (failure) { setError(extractApiErrorMessage(failure, 'Não foi possível registrar a solicitação.')); }
    finally { setBusy(false); }
  };
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header" style={styles.title}>Elegibilidade etária</Text>
    <Text style={styles.text}>{eligibility?.restricao_ativa ? 'Sua conta está em Modo Restrito. O acesso às áreas autenticadas exige uma declaração compatível com o público adulto.' : 'Durante o prazo inicial, a declaração é opcional.'}</Text>
    <Text style={styles.text}>A data é privada. Não envie documentos, fotos ou biometria por este formulário.</Text>
    {eligibility?.prazo_declaracao_em && <Text style={styles.text}>Prazo: {new Date(eligibility.prazo_declaracao_em).toLocaleString('pt-BR')}.</Text>}
    {eligibility?.proxima_correcao_permitida_em && <Text style={styles.text}>Próxima correção: {new Date(eligibility.proxima_correcao_permitida_em).toLocaleString('pt-BR')}.</Text>}
    <Text style={styles.text}>Data de nascimento (AAAA-MM-DD)</Text>
    <TextInput accessibilityLabel="Data de nascimento no formato ano mês dia" style={styles.input} value={birthDate} editable={!busy} onChangeText={value => { attemptKey.current = null; setBirthDate(value); }} placeholder="AAAA-MM-DD" placeholderTextColor={colors.textMuted} maxLength={10} autoCapitalize="none" />
    <TouchableOpacity accessibilityRole="button" disabled={busy || !birthDate} style={styles.button} onPress={() => void declare()}><Text style={styles.text}>Confirmar declaração</Text></TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => void loadCatalog()}><Text style={styles.text}>Consultar catálogo público</Text></TouchableOpacity>
    {books.map(book => <React.Fragment key={book.id}><Text style={styles.text}>{book.titulo}</Text>{book.acesso?.pode_ler_amostra && <TouchableOpacity accessibilityRole="link" onPress={() => {
      // openapi-contract: GET /biblioteca/livros/{id}/ler_amostra/
      void Linking.openURL(`${API_BASE_URL}/biblioteca/livros/${book.id}/ler_amostra/`).catch(() => setError('Não foi possível abrir a amostra.'));
    }}><Text style={styles.text}>Abrir amostra pública</Text></TouchableOpacity>}</React.Fragment>)}
    <Text accessibilityRole="header" style={styles.title}>Suporte e direitos</Text>
    <Text style={styles.text}>Solicite revisão, exportação assistida ou orientação de privacidade. O recebimento fica no protocolo; não há envio automático de e-mail.</Text>
    <TextInput accessibilityLabel="Mensagem ao suporte" style={styles.input} value={message} onChangeText={setMessage} multiline maxLength={4000} />
    <TouchableOpacity accessibilityRole="button" disabled={busy || !message.trim()} style={styles.button} onPress={() => void support()}><Text style={styles.text}>Registrar solicitação</Text></TouchableOpacity>
    <TouchableOpacity accessibilityRole="button" disabled={busy} style={styles.button} onPress={() => void exportData()}><Text style={styles.text}>Exportar meus dados para um destino que eu escolher</Text></TouchableOpacity>
    <Text style={styles.text}>Senha atual para encerramento</Text>
    <TextInput accessibilityLabel="Senha atual" style={styles.input} value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
    <TouchableOpacity accessibilityRole="button" disabled={busy || !password} style={styles.button} onPress={closeAccount}><Text style={styles.text}>Encerrar minha conta</Text></TouchableOpacity>
    {!!error && <Text accessibilityRole="alert" style={styles.text}>{error}</Text>}
    {privacyUrl ? <TouchableOpacity accessibilityRole="link" style={styles.button} onPress={() => void Linking.openURL(privacyUrl).catch(() => setError('Não foi possível abrir a política. Solicite orientação pelo suporte.'))}><Text style={styles.text}>Política de privacidade</Text></TouchableOpacity> : <Text style={styles.text}>A política de privacidade está no site público do ParaBook. Solicite o endereço oficial pelo suporte se ele não estiver configurado neste aplicativo.</Text>}
    <TouchableOpacity accessibilityRole="button" style={styles.button} onPress={() => void logout()}><Text style={styles.text}>Sair</Text></TouchableOpacity>
  </ScrollView></SafeAreaView>;
};

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary },
  text: { color: colors.textPrimary, fontSize: 16 },
  input: { color: colors.textPrimary, borderWidth: 1, borderColor: colors.textMuted, borderRadius: 12, padding: 12, minHeight: 48 },
  button: { minHeight: 48, padding: 12, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center' },
});
