import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { useAuth } from '../context/AuthContext';

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
      Alert.alert('Campos obrigatorios', 'Informe usuario e senha para entrar.');
      return;
    }

    setLoading(true);
    try {
      const result = await login(username.trim(), password, twoFactorCode.trim() || undefined);
      if (!result.success) {
        if (result.requiresTwoFactor) {
          setRequiresTwoFactor(true);
        }
        Alert.alert('Nao foi possivel entrar', result.error || 'Confira seus dados e tente novamente.');
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
            <View style={styles.inputContainer}>
              <Ionicons name="person-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Usuario"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                value={username}
                onChangeText={setUsername}
              />
            </View>

            {requiresTwoFactor && (
              <View style={styles.inputContainer}>
                <Ionicons name="keypad-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Codigo do autenticador"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  maxLength={6}
                  value={twoFactorCode}
                  onChangeText={setTwoFactorCode}
                />
              </View>
            )}

            <View style={styles.inputContainer}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                placeholder="Senha"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />
            </View>

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

        <TouchableOpacity onPress={() => navigation.navigate('Register')} activeOpacity={0.7}>
          <Text style={styles.footerText}>
            Ainda nao tem conta? <Text style={styles.footerLink}>Criar cadastro</Text>
          </Text>
        </TouchableOpacity>
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
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
  },
  backButton: {
    padding: 4,
  },
  logoBadge: {
    width: 42,
    height: 42,
    borderRadius: 14,
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
    marginBottom: 28,
    lineHeight: 20,
  },
  form: {
    gap: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    height: 54,
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    marginLeft: 10,
    fontSize: 15,
  },
  primaryButton: {
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
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
    marginBottom: 12,
  },
  footerLink: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  forgotText: { color: colors.primary, textAlign: 'right', fontSize: 13, fontWeight: '600', marginTop: 2 },
});
