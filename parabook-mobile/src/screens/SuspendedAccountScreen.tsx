import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { colors, radii, spacing } from '../theme/colors';

export const SuspendedAccountScreen = () => {
  const { user, logout } = useAuth();
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [sending, setSending] = useState(false);
  const restante = useMemo(() => {
    const fim = new Date(user?.suspensao?.termina_em || '').getTime();
    const segundos = Math.max(0, Math.ceil((fim - Date.now()) / 1000));
    const dias = Math.floor(segundos / 86400);
    const horas = Math.floor((segundos % 86400) / 3600);
    return `${dias} dias e ${horas} horas`;
  }, [user?.suspensao?.termina_em]);

  const enviar = async () => {
    if (assunto.trim().length < 5 || mensagem.trim().length < 20) {
      Alert.alert('Revise a mensagem', 'Use ao menos 5 caracteres no assunto e 20 na descrição.');
      return;
    }
    setSending(true);
    try {
      const response = await api.post('/auth/suporte/', { categoria: 'conta', assunto, mensagem });
      setAssunto('');
      setMensagem('');
      Alert.alert('Solicitação registrada', `Protocolo: ${response.data.protocolo}`);
    } catch (error) {
      Alert.alert('Não foi possível enviar', 'Tente novamente em alguns instantes.');
    } finally {
      setSending(false);
    }
  };

  return <SafeAreaView style={styles.container}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled"><View style={styles.notice}><Ionicons name="hourglass-outline" size={28} color={colors.warning} /><View style={styles.noticeText}><Text style={styles.title}>Conta temporariamente suspensa</Text><Text style={styles.body}>Você pode explorar o conteúdo público como visitante. Ações pessoais ficam bloqueadas por mais {restante}.</Text><Text style={styles.protocol}>Protocolo: {user?.suspensao?.protocolo}</Text></View></View><View style={styles.card}><Text style={styles.sectionTitle}>Falar com o suporte</Text><Text style={styles.label}>Assunto</Text><TextInput value={assunto} onChangeText={setAssunto} maxLength={120} style={styles.input} placeholder="Dúvida sobre minha conta" placeholderTextColor={colors.textMuted} /><Text style={styles.label}>Mensagem</Text><TextInput value={mensagem} onChangeText={setMensagem} maxLength={4000} multiline style={[styles.input, styles.textarea]} placeholder="Descreva sua solicitação" placeholderTextColor={colors.textMuted} /><TouchableOpacity style={styles.primary} disabled={sending} onPress={() => void enviar()}><Text style={styles.primaryText}>{sending ? 'Enviando...' : 'Enviar ao suporte'}</Text></TouchableOpacity></View><TouchableOpacity style={styles.logout} onPress={() => void logout()}><Ionicons name="log-out-outline" size={18} color={colors.error} /><Text style={styles.logoutText}>Sair da conta</Text></TouchableOpacity></ScrollView></SafeAreaView>;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.lg },
  notice: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.cardBackground },
  noticeText: { flex: 1, gap: spacing.xs },
  title: { color: colors.textPrimary, fontSize: 19, fontWeight: '700' },
  body: { color: colors.textSecondary, lineHeight: 20 },
  protocol: { color: colors.textMuted, fontSize: 12 },
  card: { padding: spacing.lg, gap: spacing.sm, borderRadius: radii.lg, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: spacing.sm },
  label: { color: colors.textSecondary, fontWeight: '600' },
  input: { minHeight: 48, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, color: colors.textPrimary, paddingHorizontal: spacing.md, backgroundColor: colors.background },
  textarea: { minHeight: 130, paddingTop: spacing.md, textAlignVertical: 'top' },
  primary: { minHeight: 48, marginTop: spacing.sm, borderRadius: radii.md, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: colors.textPrimary, fontWeight: '700' },
  logout: { minHeight: 48, flexDirection: 'row', gap: spacing.sm, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: colors.error, fontWeight: '700' },
});
