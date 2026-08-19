import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Community, communityService } from '../services/communityService';

const FALLBACK_COMMUNITIES: Community[] = [
  {
    id: '1',
    name: 'Clube do Livro: Fantasia & Sci-Fi',
    members: '1.2k membros',
    description: 'Espaço dedicado a discussões sobre mundos fantásticos, ficção científica e sagas imperdíveis.',
    category: 'Fantasia',
    isJoined: true,
  },
  {
    id: '2',
    name: 'Devs que Leem',
    members: '850 membros',
    description: 'Comunidade voltada para livros de programação, arquitetura de software e tecnologia.',
    category: 'Tecnologia',
    isJoined: true,
  },
  {
    id: '3',
    name: 'Leitores de Clássicos',
    members: '2.4k membros',
    description: 'Grupo focado na leitura mensal de grandes obras da literatura nacional e mundial.',
    category: 'Literatura',
    isJoined: false,
  },
  {
    id: '4',
    name: 'Romances Inesquecíveis',
    members: '3.1k membros',
    description: 'Para quem ama dramas, romances de época e histórias apaixonantes.',
    category: 'Romance',
    isJoined: false,
  },
];

export const CommunitiesScreen = () => {
  const [activeTab, setActiveTab] = useState<'minhas' | 'explorar'>('minhas');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    try {
      const data =
        activeTab === 'minhas'
          ? await communityService.getMyCommunities()
          : await communityService.getCommunities();
      setCommunities(data.length > 0 ? data : FALLBACK_COMMUNITIES);
    } catch (error) {
      setCommunities(FALLBACK_COMMUNITIES);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const toggleJoin = async (id: string | number) => {
    try {
      await communityService.toggleMembership(id);
      fetchCommunities();
    } catch (error) {
      Alert.alert('Login necessario', 'Entre para participar de comunidades.');
    }
  };

  const displayedCommunities = communities.filter((c) => {
    if (activeTab === 'minhas') return c.isJoined;
    return true;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comunidades</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => Alert.alert('Criar comunidade', 'Esta tela sera conectada na proxima etapa.')}
        >
          <Ionicons name="add" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Tabs Internas (Minhas / Explorar) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'minhas' && styles.tabButtonActive]}
          onPress={() => setActiveTab('minhas')}
        >
          <Text style={[styles.tabText, activeTab === 'minhas' && styles.tabTextActive]}>
            Minhas Comunidades
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'explorar' && styles.tabButtonActive]}
          onPress={() => setActiveTab('explorar')}
        >
          <Text style={[styles.tabText, activeTab === 'explorar' && styles.tabTextActive]}>
            Descobrir Novas
          </Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Comunidades */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={displayedCommunities}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>
                {activeTab === 'minhas'
                  ? 'Voce ainda nao participa de nenhuma comunidade.'
                  : 'Nenhuma comunidade disponivel para entrar no momento.'}
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="people" size={24} color={colors.primary} />
                </View>
                <View style={styles.headerInfo}>
                  <Text style={styles.communityName}>{item.name}</Text>
                  <Text style={styles.communityMembers}>{item.members}</Text>
                </View>
              </View>

              <Text style={styles.description}>{item.description}</Text>

              <View style={styles.cardFooter}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>
                    {item.maintenance ? 'Manutencao' : item.category}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    item.isJoined ? styles.leaveButton : styles.joinButton,
                  ]}
                  onPress={() => toggleJoin(item.id)}
                  disabled={item.maintenance}
                >
                  <Text
                    style={[
                      styles.actionButtonText,
                      item.isJoined ? styles.leaveButtonText : styles.joinButtonText,
                    ]}
                  >
                    {item.isJoined ? 'Participando' : 'Entrar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 14,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  communityName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  communityMembers: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  categoryBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  joinButton: {
    backgroundColor: colors.primary,
  },
  leaveButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  joinButtonText: {
    color: colors.textPrimary,
  },
  leaveButtonText: {
    color: colors.textMuted,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
});
