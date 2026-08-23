import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Achievement, featureService, RankingEntry } from '../services/featureService';
import { colors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Achievements'>;

export const AchievementsScreen = ({ navigation }: Props) => {
  const [tab, setTab] = useState<'achievements' | 'ranking'>('achievements');
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [achievementData, rankingData] = await Promise.all([
        featureService.getAchievements(),
        featureService.getRanking(),
      ]);
      setAchievements(achievementData);
      setRanking(rankingData);
    } catch {
      setError('Nao foi possivel carregar a gamificacao.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const data: Array<Achievement | RankingEntry> = tab === 'achievements' ? achievements : ranking;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.icon} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={23} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Jornada do leitor</Text>
        <View style={styles.icon} />
      </View>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'achievements' && styles.active]} onPress={() => setTab('achievements')}>
          <Text style={styles.tabText}>Conquistas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'ranking' && styles.active]} onPress={() => setTab('ranking')}>
          <Text style={styles.tabText}>Ranking</Text>
        </TouchableOpacity>
      </View>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View> : error ? (
        <View style={styles.center}><Text style={styles.state}>{error}</Text><TouchableOpacity style={styles.retry} onPress={load}><Text style={styles.retryText}>Tentar novamente</Text></TouchableOpacity></View>
      ) : (
        <FlatList<Achievement | RankingEntry>
          data={data}
          keyExtractor={(item, index) => 'id' in item ? String(item.id) : `${item.username}-${index}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.state}>Ainda nao ha dados nesta area.</Text>}
          renderItem={({ item }) => 'id' in item ? (
            <View style={[styles.card, !item.unlocked && styles.locked]}>
              <Ionicons name={item.unlocked ? 'trophy' : 'lock-closed-outline'} size={24} color={item.unlocked ? colors.accentYellow : colors.textMuted} />
              <View style={styles.info}><Text style={styles.itemTitle}>{item.name}</Text><Text style={styles.description}>{item.description}</Text></View>
              <Text style={styles.points}>+{item.points} XP</Text>
            </View>
          ) : (
            <View style={[styles.card, item.isCurrentUser && styles.current]}>
              <Text style={styles.position}>#{item.position}</Text>
              <View style={styles.info}><Text style={styles.itemTitle}>@{item.username}</Text><Text style={styles.description}>Nivel {item.level}</Text></View>
              <Text style={styles.points}>{item.xp} XP</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background }, header: { flexDirection: 'row', alignItems: 'center', padding: 14 }, icon: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, title: { flex: 1, textAlign: 'center', color: colors.textPrimary, fontSize: 18, fontWeight: '700' },
  tabs: { flexDirection: 'row', marginHorizontal: 18, padding: 4, borderRadius: 10, backgroundColor: colors.cardBackground }, tab: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 }, active: { backgroundColor: colors.primary }, tabText: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 }, state: { color: colors.textSecondary, textAlign: 'center', marginTop: 12 }, retry: { marginTop: 16, padding: 13, backgroundColor: colors.primary, borderRadius: 22 }, retryText: { color: colors.textPrimary, fontWeight: '700' }, list: { padding: 18, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', padding: 14, marginBottom: 9, borderRadius: 12, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border }, locked: { opacity: 0.55 }, current: { borderColor: colors.primary }, position: { width: 45, color: colors.primary, fontSize: 17, fontWeight: '800' }, info: { flex: 1, marginLeft: 12 }, itemTitle: { color: colors.textPrimary, fontSize: 15, fontWeight: '700' }, description: { color: colors.textSecondary, fontSize: 12, marginTop: 4 }, points: { color: colors.accentYellow, fontSize: 12, fontWeight: '700' },
});
