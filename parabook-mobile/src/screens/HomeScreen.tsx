import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, controlHeight, radii, spacing } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Book, bookService, Category } from '../services/bookService';
import { useAuth } from '../context/AuthContext';
import { BookCover } from '../components/BookCover';
import { EmptyState } from '../components/EmptyState';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [booksError, setBooksError] = useState<string | null>(null);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const fetchHomeData = async (query?: string) => {
    setLoadingBooks(true);
    setLoadingCategories(true);
    setBooksError(null);
    setCategoriesError(null);

    const [bookResult, categoryResult] = await Promise.allSettled([
      bookService.getBooks(query?.trim() || undefined),
      bookService.getCategories(),
    ]);

    if (bookResult.status === 'fulfilled') {
      setBooks(bookResult.value.slice(0, 6));
    } else {
      setBooks([]);
      setBooksError('Falha ao carregar os livros. Tente novamente.');
    }

    if (categoryResult.status === 'fulfilled') {
      setCategories(categoryResult.value.slice(0, 4));
    } else {
      setCategories([]);
      setCategoriesError('Falha ao carregar as categorias. Tente novamente.');
    }

    setLoadingBooks(false);
    setLoadingCategories(false);
  };

  useEffect(() => {
    void fetchHomeData();
  }, []);

  const navigateToStack = (screenName: 'MyLibrary' | 'BookDetail', params?: { bookId: string; title?: string }) => {
    if (screenName === 'MyLibrary') {
      navigation.navigate('MyLibrary');
    } else if (params) {
      navigation.navigate('BookDetail', params);
    }
  };

  const firstBook = books[0] || null;
  const greetingName = user?.nome || user?.username || 'leitor';
  const avatarLetter = (user?.nome || user?.username || 'P').charAt(0).toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header - Saudação */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.greetingTitle} numberOfLines={1}>Olá, {greetingName}!{'\u00A0'}👋</Text>
            <Text style={styles.greetingSubtitle}>O que você vai ler hoje?</Text>
          </View>
          <TouchableOpacity onPress={() => navigateToStack('MyLibrary')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{avatarLetter}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por título ou autor..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            onSubmitEditing={() => void fetchHomeData(search)}
          />
          <TouchableOpacity onPress={() => void fetchHomeData(search)}>
            <Ionicons name="arrow-forward-circle-outline" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Atalho para Minha Biblioteca */}
        <TouchableOpacity
          style={styles.libraryShortcut}
          onPress={() => navigateToStack('MyLibrary')}
        >
          <View style={styles.libraryShortcutLeft}>
            <Ionicons name="bookmark-outline" size={22} color={colors.primary} />
            <Text style={styles.libraryShortcutText}>Acessar Minha Biblioteca</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>

        {/* Banner do acervo */}
        <View style={styles.banner}>
          <Text style={styles.bannerBadge}>ACERVO</Text>
          <Text style={styles.bannerTitle}>Descubra novos mundos</Text>
          <Text style={styles.bannerSubtitle}>Explore os livros disponíveis no ParaBook e amplie seus horizontes.</Text>
          {firstBook && (
            <TouchableOpacity
              style={styles.bannerButton}
              onPress={() => navigateToStack('BookDetail', { bookId: String(firstBook.id), title: firstBook.title })}
            >
              <Text style={styles.bannerButtonText}>Explorar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Seção Categorias */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorias</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MainTabs', { screen: 'Catalogo' })}>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

        {loadingCategories ? (
          <View style={styles.loadingSlot}><ActivityIndicator color={colors.primary} /></View>
        ) : categoriesError ? (
          <EmptyState
            compact
            icon="cloud-offline-outline"
            title="Não foi possível carregar as categorias"
            description={categoriesError}
            action={<TouchableOpacity style={styles.retryButton} onPress={() => void fetchHomeData(search)} activeOpacity={0.78}><Text style={styles.retryButtonText}>Tentar novamente</Text></TouchableOpacity>}
          />
        ) : categories.length === 0 ? (
          <EmptyState compact icon="grid-outline" title="Nenhuma categoria cadastrada" description="As categorias do acervo aparecerão aqui." />
        ) : (
          <View style={styles.categoriesGrid}>
            {categories.map((category, index) => {
              const iconColors = [colors.primary, colors.accentGreen, '#EC4899', colors.accentYellow];
              return (
                <View key={category.id} style={styles.categoryCard}>
                  <Ionicons name="book-outline" size={24} color={iconColors[index] || colors.primary} />
                  <Text style={styles.categoryTitle} numberOfLines={1}>
                    {category.name}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Seção Livros do acervo */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{search.trim() ? 'Resultados da busca' : 'Livros do acervo'}</Text>
        </View>

        {loadingBooks ? (
          <View style={styles.loadingSlot}><ActivityIndicator color={colors.primary} /></View>
        ) : booksError ? (
          <EmptyState
            compact
            icon="cloud-offline-outline"
            title="Não foi possível carregar os livros"
            description={booksError}
            action={<TouchableOpacity style={styles.retryButton} onPress={() => void fetchHomeData(search)} activeOpacity={0.78}><Text style={styles.retryButtonText}>Tentar novamente</Text></TouchableOpacity>}
          />
        ) : (
          books.length === 0 ? (
            <EmptyState
              compact
              icon={search.trim() ? 'search-outline' : 'book-outline'}
              title={search.trim() ? 'Nenhum livro encontrado' : 'Nenhum livro cadastrado'}
              description={search.trim() ? 'Tente buscar por outro título ou autor.' : 'Os livros adicionados ao acervo aparecerão aqui.'}
            />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentBooksScroll}>
              {books.map((book) => (
                <TouchableOpacity
                  key={book.id}
                  style={styles.bookCard}
                  onPress={() => navigateToStack('BookDetail', { bookId: String(book.id), title: book.title })}
                >
                  <BookCover uri={book.cover_url} width={108} height={156} />
                  <Text style={styles.bookTitle} numberOfLines={2}>
                    {book.title}
                  </Text>
                  <Text style={styles.bookAuthor} numberOfLines={1}>
                    {book.author}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )
        )}

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
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.md,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  greetingSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
    fontSize: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    paddingHorizontal: 16,
    height: controlHeight,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    marginLeft: 10,
    marginRight: 10,
    fontSize: 15,
  },
  libraryShortcut: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radii.md,
    minHeight: 48,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  libraryShortcutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  libraryShortcutText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  banner: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: spacing.xl,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerBadge: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 1,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 19,
  },
  bannerButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 42,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  bannerButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  retryButton: {
    marginTop: 16,
    minHeight: 40,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  categoryCard: {
    backgroundColor: colors.cardBackground,
    width: '48%',
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  recentBooksScroll: {
    flexDirection: 'row',
  },
  bookCard: {
    width: 108,
    marginRight: spacing.md,
  },
  loadingSlot: {
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  bookAuthor: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
