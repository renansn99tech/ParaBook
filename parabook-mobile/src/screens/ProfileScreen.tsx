import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
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
      setErrorMessage('Nao foi possivel carregar seu perfil agora.');
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
        <Text style={styles.statusText}>Faca login para ver seu perfil.</Text>
      </SafeAreaView>
    );
  }

  const stats = fullProfile?.estatisticas;
  const displayName = fullProfile?.usuario?.nome || user.nome || user.username;
  const displayUsername = fullProfile?.usuario?.username || user.username;
  const description = fullProfile?.perfil?.descricao_perfil || user.descricao_perfil || 'Sem descricao cadastrada.';
  const totalLidos = stats?.total_lidos ?? 0;
  const lendoAgora = stats?.lendo_agora ?? 0;
  const totalComunidades = stats?.total_comunidades ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => void loadProfile()}>
            <Ionicons name="refresh-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.userCard}>
          {fullProfile?.perfil?.foto || user.foto ? (
            <Image source={{ uri: fullProfile?.perfil?.foto || user.foto || undefined }} style={styles.avatarContainer} />
          ) : (
            <View style={styles.avatarContainer}><Ionicons name="person" size={36} color={colors.primary} /></View>
          )}
          <Text style={styles.userName}>{displayName}</Text>
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
            <Text style={styles.infoText}>{fullProfile?.perfil?.localizacao || user.localizacao || 'Localizacao nao informada'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
            <Text style={styles.infoText}>{user.email}</Text>
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
              <Text style={styles.menuItemText}>Historico de Leitura</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Authors')}>
            <View style={styles.menuItemLeft}><Ionicons name="create-outline" size={20} color={colors.primary} /><Text style={styles.menuItemText}>Autores</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Notifications')}>
            <View style={styles.menuItemLeft}><Ionicons name="notifications-outline" size={20} color={colors.primary} /><Text style={styles.menuItemText}>Notificacoes</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Achievements')}>
            <View style={styles.menuItemLeft}><Ionicons name="trophy-outline" size={20} color={colors.primary} /><Text style={styles.menuItemText}>Conquistas e ranking</Text></View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('MyLibrary', { reviewedOnly: true })}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Avaliacoes e Resenhas</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={() => void logout()}>
          <Ionicons name="log-out-outline" size={18} color={colors.textPrimary} />
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
    paddingHorizontal: 20,
    paddingBottom: 24,
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
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  iconButton: {
    padding: 6,
  },
  userCard: {
    alignItems: 'center',
    marginVertical: 16,
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
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginVertical: 12,
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
    borderRadius: 14,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    flex: 1,
  },
  menuSection: {
    marginTop: 20,
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
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
    color: '#F87171',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  logoutButton: {
    marginTop: 18,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  logoutText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
});
