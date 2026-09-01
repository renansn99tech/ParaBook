import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Community, communityService } from '../services/communityService';
import { RootStackParamList } from '../navigation/types';
import { colors, radii, spacing } from '../theme/colors';
import { EmptyState } from '../components/EmptyState';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

const getErrorMessage = (error: unknown, fallback: string) => {
  const response = (error as { response?: { data?: { detail?: string; erro?: string } } })?.response;
  return response?.data?.detail || response?.data?.erro || fallback;
};

export const CommunitiesScreen = () => {
  const navigation = useNavigation<Navigation>();
  const [activeTab, setActiveTab] = useState<'minhas' | 'explorar'>('explorar');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [membershipId, setMembershipId] = useState<string | number | null>(null);

  const fetchCommunities = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = activeTab === 'minhas'
        ? await communityService.getMyCommunities()
        : await communityService.getCommunities();
      setCommunities(data);
    } catch (error) {
      setCommunities([]);
      setErrorMessage(getErrorMessage(error, 'Não foi possível carregar as comunidades.'));
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchCommunities();
  }, [fetchCommunities]);

  const toggleMembership = async (community: Community) => {
    if (community.maintenance) {
      Alert.alert('Comunidade em manutenção', 'Esta comunidade está indisponível temporariamente.');
      return;
    }

    setMembershipId(community.id);
    try {
      const action = await communityService.toggleMembership(community.id);
      const isJoined = action === 'joined';
      setCommunities((current) => current
        .map((item) => item.id === community.id
          ? { ...item, isJoined, members: `${Math.max(0, Number.parseInt(item.members, 10) + (isJoined ? 1 : -1))} membros` }
          : item)
        .filter((item) => activeTab !== 'minhas' || item.isJoined));
      Alert.alert(
        isJoined ? 'Participação confirmada' : 'Você saiu da comunidade',
        isJoined ? `Agora você participa de ${community.name}.` : `Você não participa mais de ${community.name}.`
      );
    } catch (error) {
      Alert.alert('Não foi possível atualizar', getErrorMessage(error, 'Verifique sua conexão e tente novamente.'));
    } finally {
      setMembershipId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Comunidades</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate('CreateCommunity')}>
          <Ionicons name="add" size={20} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'explorar' && styles.tabButtonActive]}
          onPress={() => setActiveTab('explorar')}
        >
          <Text style={[styles.tabText, activeTab === 'explorar' && styles.tabTextActive]}>Descobrir</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'minhas' && styles.tabButtonActive]}
          onPress={() => setActiveTab('minhas')}
        >
          <Text style={[styles.tabText, activeTab === 'minhas' && styles.tabTextActive]}>Minhas</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerState}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : errorMessage ? (
        <View style={styles.centerState}>
          <EmptyState icon="cloud-offline-outline" title="Comunidades indisponíveis" description={errorMessage} action={<TouchableOpacity style={styles.retryButton} onPress={fetchCommunities} activeOpacity={0.78}><Text style={styles.retryButtonText}>Tentar novamente</Text></TouchableOpacity>} />
        </View>
      ) : (
        <FlatList
          data={communities}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onRefresh={fetchCommunities}
          refreshing={loading}
          ListEmptyComponent={
            <View style={styles.centerState}>
              <EmptyState
                icon="people-outline"
                title={activeTab === 'minhas' ? 'Você ainda não participa de comunidades' : 'Nenhuma comunidade disponível'}
                description={activeTab === 'minhas' ? 'Explore comunidades e entre nas que combinam com suas leituras.' : 'Novas comunidades aparecerão aqui.'}
              />
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('CommunityDetail', { communityId: item.id, title: item.name })}
            >
              <View style={styles.cardHeader}>
                <View style={styles.avatarPlaceholder}><Ionicons name="people" size={22} color={colors.primary} /></View>
                <View style={styles.headerInfo}>
                  <Text style={styles.communityName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.communityMembers}>{item.members}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </View>
              <Text style={styles.description} numberOfLines={3}>{item.description}</Text>
              <View style={styles.cardFooter}>
                <Text style={styles.category}>{item.maintenance ? 'Em manutenção' : item.category}</Text>
                <TouchableOpacity
                  style={[styles.actionButton, item.isJoined ? styles.leaveButton : styles.joinButton, (membershipId === item.id || item.maintenance) && styles.actionButtonDisabled]}
                  disabled={membershipId === item.id || item.maintenance}
                  onPress={() => toggleMembership(item)}
                >
                  {membershipId === item.id ? <ActivityIndicator size="small" color={colors.textPrimary} /> : (
                    <Text style={styles.actionButtonText}>{item.isJoined ? 'Sair' : 'Entrar'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md },
  headerTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '700' },
  createButton: { width: 42, height: 42, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  tabContainer: { flexDirection: 'row', marginHorizontal: spacing.xl, marginBottom: spacing.md, backgroundColor: colors.cardBackground, borderRadius: radii.md, padding: spacing.xs, borderWidth: 1, borderColor: colors.border },
  tabButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  tabButtonActive: { backgroundColor: colors.primary },
  tabText: { color: colors.textSecondary, fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: colors.textPrimary },
  listContent: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, paddingTop: spacing.xs, flexGrow: 1 },
  centerState: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl },
  retryButton: { marginTop: spacing.lg, minHeight: 42, justifyContent: 'center', paddingHorizontal: spacing.lg, borderRadius: radii.pill, backgroundColor: colors.primary },
  retryButtonText: { color: colors.textPrimary, fontWeight: '700' },
  card: { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.lg, marginBottom: spacing.md },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  headerInfo: { flex: 1, marginLeft: 11 },
  communityName: { color: colors.textPrimary, fontSize: 16, fontWeight: '700' },
  communityMembers: { color: colors.textMuted, fontSize: 12, marginTop: 3 },
  description: { color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 14 },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  category: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  actionButton: { minWidth: 80, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.pill, paddingHorizontal: spacing.md },
  joinButton: { backgroundColor: colors.primary },
  leaveButton: { borderWidth: 1, borderColor: colors.border },
  actionButtonDisabled: { opacity: 0.55 },
  actionButtonText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
});
