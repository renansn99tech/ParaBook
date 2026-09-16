import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, controlHeight, radii, spacing } from '../theme/colors';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainTabParamList, RootStackParamList } from '../navigation/types';
import { Book, bookService } from '../services/bookService';
import { BookCover } from '../components/BookCover';
import { EmptyState } from '../components/EmptyState';
import { ApiErrorPresentation, describeApiError } from '../services/apiError';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ExploreScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp<MainTabParamList, 'Catalogo'>>();
  const categoryId = route.params?.categoryId;
  const categoryName = route.params?.categoryName;
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorPresentation | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const [reloadToken, setReloadToken] = useState(0);
  const latestRequest = useRef(0);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const requestId = ++latestRequest.current;
      setLoading(true);
      setError(null);
      try {
        const data = await bookService.getBooks(search.trim() || undefined, categoryId);
        if (requestId !== latestRequest.current) return;
        setBooks(data);
      } catch (error) {
        if (requestId !== latestRequest.current) return;
        setBooks([]);
        setError(describeApiError(error));
      } finally {
        if (requestId === latestRequest.current) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timeout);
      latestRequest.current += 1;
    };
  }, [categoryId, reloadToken, search]);

  const handleBookPress = (bookId: string, title: string) => {
    navigation.navigate('BookDetail', { bookId, title });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Catálogo</Text>
        <Text style={styles.subtitle}>Encontre seu próximo livro favorito</Text>
      </View>

      <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
        <Ionicons name="search-outline" size={20} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Pesquisar por título ou autor..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          returnKeyType="search"
        />
        {search.length > 0 ? (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {categoryId ? (
        <View style={styles.activeFilter}>
          <Ionicons name="funnel-outline" size={15} color={colors.primary} />
          <Text style={styles.activeFilterText} numberOfLines={1}>{categoryName || 'Categoria selecionada'}</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('MainTabs', { screen: 'Catalogo' })}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Remover filtro de categoria"
          >
            <Ionicons name="close" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{search.trim() || categoryId ? 'Resultados' : 'Livros em destaque'}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.stateWrapper}>
          <EmptyState
            icon={error.icon}
            title={error.title}
            description={error.message}
            action={<TouchableOpacity style={styles.retryButton} onPress={() => setReloadToken((value) => value + 1)} activeOpacity={0.78}><Text style={styles.retryButtonText}>Tentar novamente</Text></TouchableOpacity>}
          />
        </View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            <View style={styles.stateWrapper}>
              <EmptyState
                icon={search.trim() || categoryId ? 'search-outline' : 'book-outline'}
                title={search.trim() || categoryId ? 'Nenhum livro encontrado para este recorte' : 'O acervo ainda não possui livros'}
                description={search.trim() || categoryId ? 'Tente outra busca ou remova o filtro de categoria.' : 'Os livros publicados aparecerão aqui.'}
              />
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookItem}
              onPress={() => handleBookPress(String(item.id), item.title)}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${item.title}, de ${item.author}`}
            >
              <BookCover uri={item.cover_url} width={52} height={76} title={item.title} />
              <View style={styles.bookInfo}>
                <Text style={styles.bookTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {item.author}
                </Text>
                <Text style={styles.bookCategory} numberOfLines={1}>
                  {item.category || 'Acervo ParaBook'}
                </Text>
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
    paddingHorizontal: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
    marginTop: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    height: controlHeight,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchContainerFocused: {
    borderColor: colors.primary,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    marginLeft: 10,
    fontSize: 15,
  },
  sectionHeader: {
    marginBottom: spacing.md,
  },
  activeFilter: {
    minHeight: 40,
    marginTop: -spacing.md,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  activeFilterText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flexShrink: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 180,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  stateWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  retryButton: {
    marginTop: spacing.lg,
    minHeight: 44,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  bookItem: {
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
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 21,
  },
  bookAuthor: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  bookCategory: {
    fontSize: 11,
    color: colors.primary,
    marginTop: 4,
    fontWeight: '600',
  },
});
