import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors, controlHeight, radii, spacing } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { FormField } from '../components/FormField';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export const LoginScreen = ({ navigation }: Props) => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [requiresTwoFactor, setRequiresTwoFactor] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      Alert.alert('Campos obrigatórios', 'Informe usuário e senha para entrar.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(username.trim(), password, twoFactorCode.trim() || undefined);
      if (!result.success) {
        if (result.requiresTwoFactor) {
          setRequiresTwoFactor(true);
        }
        Alert.alert('Não foi possível entrar', result.error || 'Confira seus dados e tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.logoBadge}>
            <Text style={styles.logoBadgeText}>P</Text>
          </View>
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Entrar no ParaBook</Text>
          <Text style={styles.subtitle}>Continue sua leitura, estante e comunidades.</Text>

          <View style={styles.form}>
            <FormField label="Usuário" icon="person-outline" placeholder="Seu usuário" autoCapitalize="none" autoComplete="username" value={username} onChangeText={setUsername} />

            {requiresTwoFactor && (
              <FormField label="Código de verificação" icon="keypad-outline" placeholder="Código do autenticador" keyboardType="number-pad" autoCapitalize="none" autoComplete="one-time-code" maxLength={6} value={twoFactorCode} onChangeText={setTwoFactorCode} />
            )}

            <FormField label="Senha" icon="lock-closed-outline" placeholder="Sua senha" isPassword autoComplete="current-password" value={password} onChangeText={setPassword} onSubmitEditing={() => void handleLogin()} returnKeyType="done" />

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Entrar</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} activeOpacity={0.7}>
              <Text style={styles.forgotText}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7} style={styles.footerButton}>
          <Text style={styles.footerText}>
            Ainda não tem conta? <Text style={styles.footerLink}>Criar cadastro</Text>
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 4,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadgeText: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    marginBottom: spacing.xxl,
    lineHeight: 20,
  },
  form: {
    gap: spacing.md,
  },
  primaryButton: {
    height: controlHeight,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.xs,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    color: colors.textSecondary,
    textAlign: 'center',
    fontSize: 14,
  },
  footerButton: {
    minHeight: 44,
    justifyContent: 'center',
  },
  footerLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  forgotText: { color: colors.primary, textAlign: 'right', fontSize: 13, fontWeight: '600', marginTop: 2 },
});
