import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CompositeNavigationProp, useFocusEffect, useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { colors, radii, spacing } from '../theme/colors';
import { bookService, LibraryStatus, UserBookItem } from '../services/bookService';
import { BookCover } from '../components/BookCover';
import { EmptyState } from '../components/EmptyState';

type Props = NativeStackScreenProps<RootStackParamList, 'MyLibrary'>;
type LibraryParams = RootStackParamList['MyLibrary'];
type LibraryTabNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Biblioteca'>,
  NativeStackNavigationProp<RootStackParamList>
>;

type LibraryContentProps = {
  params?: LibraryParams;
  showBackButton: boolean;
  onBack?: () => void;
  onOpenBook: (bookId: string, title: string) => void;
};

const LibraryContent = ({ params, showBackButton, onBack, onOpenBook }: LibraryContentProps) => {
  const [activeTab, setActiveTab] = useState<LibraryStatus>(params?.initialStatus || 'lendo');
  const [books, setBooks] = useState<UserBookItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchLibrary = useCallback(async () => {
    setErrorMessage(null);
    try {
      const showAllStatuses = params?.favoritesOnly || params?.reviewedOnly;
      const data = await bookService.getUserLibrary(showAllStatuses ? undefined : activeTab);
      setBooks(data.filter((item) => {
        if (params?.favoritesOnly) return Boolean(item.favorite);
        if (params?.reviewedOnly) return item.rating !== null && item.rating !== undefined;
        return true;
      }));
    } catch (error) {
      setBooks([]);
      setErrorMessage('Não foi possível carregar sua biblioteca agora.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, params?.favoritesOnly, params?.reviewedOnly]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    void fetchLibrary();
  }, [fetchLibrary]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchLibrary();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {showBackButton ? (
          <TouchableOpacity
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : <View style={styles.headerPlaceholder} />}
        <Text style={styles.headerTitle} numberOfLines={1}>{params?.favoritesOnly ? 'Favoritos' : params?.reviewedOnly ? 'Avaliações' : 'Minha Biblioteca'}</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      {/* Abas da Biblioteca */}
      {!params?.favoritesOnly && !params?.reviewedOnly && <View style={styles.tabsContainer}>
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
        <View style={styles.stateWrapper}>
          <EmptyState icon="cloud-offline-outline" title="Biblioteca indisponível" description={errorMessage} action={<TouchableOpacity style={styles.retryButton} onPress={fetchLibrary} activeOpacity={0.78}><Text style={styles.retryButtonText}>Tentar novamente</Text></TouchableOpacity>} />
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
            <View style={styles.stateWrapper}>
              <EmptyState icon="bookmark-outline" title="Esta estante está vazia" description="Os livros que você adicionar aparecerão aqui." />
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookCard}
              activeOpacity={0.7}
              disabled={Boolean(item.book.publicationStatus && item.book.publicationStatus !== 'publicado')}
              onPress={() => onOpenBook(String(item.book.id), item.book.title)}
            >
              <BookCover uri={item.book.cover_url} width={52} height={76} />

              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {item.book.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {item.book.author}
                </Text>

                {item.book.publicationStatus && item.book.publicationStatus !== 'publicado' && <Text style={styles.bookAuthor}>Obra indisponível</Text>}
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

export const MyLibraryScreen = ({ navigation, route }: Props) => (
  <LibraryContent
    params={route.params}
    showBackButton
    onBack={() => navigation.goBack()}
    onOpenBook={(bookId, title) => navigation.navigate('BookDetail', { bookId, title })}
  />
);

export const LibraryTabScreen = () => {
  const navigation = useNavigation<LibraryTabNavigation>();
  return (
    <LibraryContent
      showBackButton={false}
      onOpenBook={(bookId, title) => navigation.navigate('BookDetail', { bookId, title })}
    />
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
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  headerPlaceholder: {
    width: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: spacing.xl,
    marginVertical: spacing.md,
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: radii.sm,
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    paddingTop: spacing.xs,
    flexGrow: 1,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: spacing.md,
    borderRadius: radii.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookInfo: {
    flex: 1,
    marginLeft: spacing.md,
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 20,
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
  stateWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  retryButton: {
    marginTop: 16,
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
