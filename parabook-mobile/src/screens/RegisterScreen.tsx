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

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

const validatePassword = (value: string) => {
  if (value.length < 8) {
    return 'A senha precisa ter pelo menos 8 caracteres.';
  }

  if (/^\d+$/.test(value)) {
    return 'A senha não pode ser inteiramente numérica.';
  }

  return null;
};

export const RegisterScreen = ({ navigation }: Props) => {
  const { register } = useAuth();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username.trim() || !email.trim() || !password || !passwordConfirm) {
      Alert.alert('Campos obrigatórios', 'Preencha usuário, e-mail, senha e confirmação da senha.');
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      Alert.alert('Senha inválida', passwordError);
      return;
    }

    if (password !== passwordConfirm) {
      Alert.alert('Senhas diferentes', 'A confirmacao precisa ser igual a senha.');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Termos de uso', 'Aceite os termos para criar sua conta.');
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        username: username.trim(),
        email: email.trim(),
        password,
        passwordConfirm,
        termosAceitos: acceptedTerms,
      });

      if (!result.success) {
        Alert.alert('Cadastro não concluído', result.error || 'Revise os dados informados e tente novamente.');
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
          <Text style={styles.headerTitle}>Criar conta</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>Bem-vindo ao ParaBook</Text>
          <Text style={styles.subtitle}>Monte sua estante e acompanhe suas leituras no app.</Text>

          <View style={styles.form}>
            <FormField label="Usuário" icon="person-outline" placeholder="Escolha um usuário" autoCapitalize="none" autoComplete="username-new" value={username} onChangeText={setUsername} />

            <FormField label="E-mail" icon="mail-outline" placeholder="voce@exemplo.com" autoCapitalize="none" autoComplete="email" keyboardType="email-address" value={email} onChangeText={setEmail} />

            <FormField label="Senha" icon="lock-closed-outline" placeholder="Crie uma senha" isPassword autoComplete="new-password" value={password} onChangeText={setPassword} />

            <FormField label="Confirmar senha" icon="shield-checkmark-outline" placeholder="Repita sua senha" isPassword autoComplete="new-password" value={passwordConfirm} onChangeText={setPasswordConfirm} onSubmitEditing={() => void handleRegister()} returnKeyType="done" />

            <TouchableOpacity
              style={styles.termsRow}
              onPress={() => setAcceptedTerms((current) => !current)}
              activeOpacity={0.8}
            >
              <View style={[styles.checkbox, acceptedTerms && styles.checkboxActive]}>
                {acceptedTerms && <Ionicons name="checkmark" size={16} color={colors.textPrimary} />}
              </View>
              <Text style={styles.termsText}>Li e aceito os termos de uso vigentes.</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.textPrimary} />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Cadastrar</Text>
                  <Ionicons name="arrow-forward" size={18} color={colors.textPrimary} />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} activeOpacity={0.7} style={styles.footerButton}>
          <Text style={styles.footerText}>
            Já tem cadastro? <Text style={styles.footerLink}>Entrar</Text>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerPlaceholder: {
    width: 24,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
  },
  checkboxActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  termsText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
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
});
