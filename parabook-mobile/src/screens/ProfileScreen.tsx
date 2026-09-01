import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { authService, FullUserProfile } from '../services/authService';

export const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, logout } = useAuth();
  const [fullProfile, setFullProfile] = useState<FullUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.username) {
      setFullProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await authService.getFullUserProfile(user.username);
      setFullProfile(response);
    } catch {
      setFullProfile(null);
      setErrorMessage('Não foi possível carregar seu perfil agora.');
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerState]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.statusText}>Carregando perfil...</Text>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.container, styles.centerState]}>
        <Ionicons name="person-outline" size={42} color={colors.textMuted} />
        <Text style={styles.statusText}>Faça login para ver seu perfil.</Text>
      </SafeAreaView>
    );
  }

  const stats = fullProfile?.estatisticas;
  const displayName = fullProfile?.usuario?.nome || user.nome || user.username;
  const displayUsername = fullProfile?.usuario?.username || user.username;
  const description = fullProfile?.perfil?.descricao_perfil || user.descricao_perfil || 'Sem descrição cadastrada.';
  const totalLidos = stats?.total_lidos ?? 0;
  const lendoAgora = stats?.lendo_agora ?? 0;
  const totalComunidades = stats?.total_comunidades ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => void loadProfile()} activeOpacity={0.7} accessibilityLabel="Atualizar perfil">
            <Ionicons name="refresh-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.userCard}>
          {fullProfile?.perfil?.foto || user.foto ? (
            <Image source={{ uri: fullProfile?.perfil?.foto || user.foto || undefined }} style={styles.avatarContainer} />
          ) : (
            <View style={styles.avatarContainer}><Ionicons name="person" size={36} color={colors.primary} /></View>
          )}
          <Text style={styles.userName} numberOfLines={2}>{displayName}</Text>
          <Text style={styles.userTag}>@{displayUsername}</Text>
          <Text style={styles.userDescription}>{description}</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalLidos}</Text>
            <Text style={styles.statLabel}>Lidos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{lendoAgora}</Text>
            <Text style={styles.statLabel}>Lendo</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{totalComunidades}</Text>
            <Text style={styles.statLabel}>Comunidades</Text>
          </View>
        </View>

        <View style={styles.goalCard}>
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText} numberOfLines={2}>{fullProfile?.perfil?.localizacao || user.localizacao || 'Localização não informada'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText} numberOfLines={2}>{user.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>{user.termos_aceitos ? 'Termos aceitos' : 'Termos pendentes'}</Text>
          </View>
          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Minha Biblioteca</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('MyLibrary', { initialStatus: 'quero_ler' })}
          >
            <View style={styles.menuItemLeft}>
              <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Salvos para Ler</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyLibrary', { initialStatus: 'lido' })}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Histórico de Leitura</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Authors')}>
            <View style={styles.menuItemLeft}><Ionicons name="create-outline" size={20} color={colors.primary} /><Text style={styles.menuItemText}>Autores</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications')}>
            <View style={styles.menuItemLeft}><Ionicons name="notifications-outline" size={20} color={colors.primary} /><Text style={styles.menuItemText}>Notificações</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Achievements')}>
            <View style={styles.menuItemLeft}><Ionicons name="trophy-outline" size={20} color={colors.primary} /><Text style={styles.menuItemText}>Conquistas e ranking</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyLibrary', { reviewedOnly: true })}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Avaliações e Resenhas</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => void logout()}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  statusText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  userCard: {
    alignItems: 'center',
    marginVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  userTag: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  userDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 10,
    textAlign: 'center',
    lineHeight: 19,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  goalCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 28,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  menuSection: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    minHeight: 52,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  errorText: {
    color: colors.error,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: {
    color: colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
});
