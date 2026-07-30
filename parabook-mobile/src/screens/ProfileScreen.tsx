import React from 'react';
import {
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

export const ProfileScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const userProfile = {
    name: 'Leitor Parabook',
    username: '@leitor_parabook',
    booksRead: 14,
    readingGoal: 20,
    totalPages: '4.250',
    favoritesCount: 8,
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Topo / Configurações */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil</Text>
          <TouchableOpacity style={styles.iconButton}>
            <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Card do Usuário */}
        <View style={styles.userCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={36} color={colors.primary} />
          </View>
          <Text style={styles.userName}>{userProfile.name}</Text>
          <Text style={styles.userTag}>{userProfile.username}</Text>
        </View>

        {/* Estatísticas de Leitura */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userProfile.booksRead}</Text>
            <Text style={styles.statLabel}>Lidos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userProfile.totalPages}</Text>
            <Text style={styles.statLabel}>Páginas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>{userProfile.favoritesCount}</Text>
            <Text style={styles.statLabel}>Favoritos</Text>
          </View>
        </View>

        {/* Meta Anual */}
        <View style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <View style={styles.goalTitleWrapper}>
              <Ionicons name="trophy-outline" size={20} color={colors.primary} />
              <Text style={styles.goalTitle}>Meta de Leitura 2026</Text>
            </View>
            <Text style={styles.goalProgress}>
              {userProfile.booksRead}/{userProfile.readingGoal} livros
            </Text>
          </View>

          {/* Barra de Progresso Visual */}
          <View style={styles.progressBarBg}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${(userProfile.booksRead / userProfile.readingGoal) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Menu de Estantes / Opções */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Minha Biblioteca</Text>

<TouchableOpacity 
  style={styles.menuItem}
  onPress={() => navigation.navigate('MyLibrary')}
>
  <View style={styles.menuItemLeft}>
    <Ionicons name="bookmark-outline" size={20} color={colors.primary} />
    <Text style={styles.menuItemText}>Salvos para Ler</Text>
  </View>
  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
</TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="time-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Histórico de Leitura</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Ionicons name="heart-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Avaliações e Resenhas</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
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
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  goalProgress: {
    fontSize: 12,
    color: colors.textMuted,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
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
});