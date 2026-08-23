import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { bookService, LibraryStatus, UserBookItem } from '../services/bookService';

type Props = NativeStackScreenProps<RootStackParamList, 'MyLibrary'>;

export const MyLibraryScreen = ({ navigation, route }: Props) => {
  const [activeTab, setActiveTab] = useState<LibraryStatus>(route.params?.initialStatus || 'lendo');
  const [books, setBooks] = useState<UserBookItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLibrary = useCallback(async () => {
    setErrorMessage(null);
    try {
      const showAllStatuses = route.params?.favoritesOnly || route.params?.reviewedOnly;
      const data = await bookService.getUserLibrary(showAllStatuses ? undefined : activeTab);
      setBooks(data.filter((item) => {
        if (route.params?.favoritesOnly) return Boolean(item.favorite);
        if (route.params?.reviewedOnly) return item.rating !== null && item.rating !== undefined;
        return true;
      }));
    } catch (error) {
      setBooks([]);
      setErrorMessage('Nao foi possivel carregar sua biblioteca agora.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, route.params?.favoritesOnly, route.params?.reviewedOnly]);

  useEffect(() => {
    setLoading(true);
    fetchLibrary();
  }, [fetchLibrary]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchLibrary();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{route.params?.favoritesOnly ? 'Favoritos' : route.params?.reviewedOnly ? 'Avaliacoes' : 'Minha Biblioteca'}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Abas da Biblioteca */}
      {!route.params?.favoritesOnly && !route.params?.reviewedOnly && <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lendo' && styles.activeTab]}
          onPress={() => setActiveTab('lendo')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'lendo' && styles.activeTabText]}>
            Lendo
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'quero_ler' && styles.activeTab]}
          onPress={() => setActiveTab('quero_ler')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'quero_ler' && styles.activeTabText]}>
            Quero Ler
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'lido' && styles.activeTab]}
          onPress={() => setActiveTab('lido')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'lido' && styles.activeTabText]}>
            Lidos
          </Text>
        </TouchableOpacity>
      </View>}

      {/* Conteúdo Principal (Loading ou Lista) */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : errorMessage ? (
        <View style={styles.emptyState}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.textMuted} />
          <Text style={styles.emptyText}>{errorMessage}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchLibrary}>
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="bookmark-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyText}>Nenhum livro nesta estante ainda.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookCard}
              activeOpacity={0.7}
              onPress={() =>
                navigation.navigate('BookDetail', {
                  bookId: String(item.book.id),
                  title: item.book.title,
                })
              }
            >
              {item.book.cover_url ? (
                <Image source={{ uri: item.book.cover_url }} style={styles.coverImage} resizeMode="cover" />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="book" size={28} color={colors.primary} />
                </View>
              )}

              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {item.book.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {item.book.author}
                </Text>

                {item.status === 'lendo' && (
                  <View style={styles.progressSection}>
                    <View style={styles.progressBarBg}>
                      <View style={[styles.progressBarFill, { width: `${item.progress}%` }]} />
                    </View>
                    <Text style={styles.progressText}>{item.progress}%</Text>
                  </View>
                )}
              </View>

              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </TouchableOpacity>
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
    paddingVertical: 12,
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
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  activeTabText: {
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverPlaceholder: {
    width: 46,
    height: 64,
    backgroundColor: colors.background,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverImage: {
    width: 46,
    height: 64,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  bookAuthor: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  progressBarBg: {
    flex: 1,
    height: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 21,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
