import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Book, bookService, Category } from '../services/bookService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const FALLBACK_BOOKS: Book[] = [
  { id: '1', title: 'O Hobbit', author: 'J.R.R. Tolkien' },
  { id: '2', title: '1984', author: 'George Orwell' },
  { id: '3', title: 'Clean Code', author: 'Robert C. Martin' },
];

const FALLBACK_CATEGORIES: Category[] = [
  { id: '1', name: 'Filosofia' },
  { id: '2', name: 'Literatura' },
  { id: '3', name: 'Religiosos' },
  { id: '4', name: 'Infantis' },
];

export const HomeScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);

  useEffect(() => {
    const fetchHomeData = async () => {
      try {
        const [bookData, categoryData] = await Promise.all([
          bookService.getFeaturedBooks(),
          bookService.getCategories(),
        ]);
        setBooks(bookData.slice(0, 6));
        setCategories(categoryData.slice(0, 4));
      } catch (error) {
        setBooks(FALLBACK_BOOKS);
        setCategories(FALLBACK_CATEGORIES);
      } finally {
        setLoadingBooks(false);
      }
    };

    fetchHomeData();
  }, []);

  const navigateToStack = (screenName: 'MyLibrary' | 'BookDetail', params?: { bookId: string; title?: string }) => {
    if (screenName === 'MyLibrary') {
      navigation.navigate('MyLibrary');
    } else if (params) {
      navigation.navigate('BookDetail', params);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header - Saudação */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingTitle}>Olá, Rodrigo! 👋</Text>
            <Text style={styles.greetingSubtitle}>O que você vai ler hoje?</Text>
          </View>
          <TouchableOpacity onPress={() => navigateToStack('MyLibrary')}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>R</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar livros, autores, categorias..."
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity onPress={() => navigateToStack('BookDetail', { bookId: '1', title: 'O Hobbit' })}>
            <Ionicons name="options-outline" size={20} color={colors.textMuted} />
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

        {/* Banner Destaque */}
        <View style={styles.banner}>
          <Text style={styles.bannerBadge}>DESTAQUE</Text>
          <Text style={styles.bannerTitle}>Descubra novos mundos</Text>
          <Text style={styles.bannerSubtitle}>Explore milhares de livros e amplie seus horizontes.</Text>
          <TouchableOpacity
            style={styles.bannerButton}
            onPress={() => navigateToStack('BookDetail', { bookId: '1', title: 'O Hobbit' })}
          >
            <Text style={styles.bannerButtonText}>Explorar →</Text>
          </TouchableOpacity>
        </View>

        {/* Seção Categorias */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Categorias</Text>
          <TouchableOpacity>
            <Text style={styles.seeAllText}>Ver todas</Text>
          </TouchableOpacity>
        </View>

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

        {/* Seção Livros Recomendados */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Continuar Lendo</Text>
        </View>

        {loadingBooks ? (
          <ActivityIndicator color={colors.primary} style={styles.loadingIndicator} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.recentBooksScroll}>
            {books.map((book) => (
              <TouchableOpacity
                key={book.id}
                style={styles.bookCard}
                onPress={() => navigateToStack('BookDetail', { bookId: String(book.id), title: book.title })}
              >
                {book.cover_url ? (
                  <Image source={{ uri: book.cover_url }} style={styles.bookCoverImage} resizeMode="cover" />
                ) : (
                  <View style={styles.bookCover}>
                    <Ionicons name="book" size={32} color={colors.primary} />
                  </View>
                )}
                <Text style={styles.bookTitle} numberOfLines={1}>
                  {book.title}
                </Text>
                <Text style={styles.bookAuthor} numberOfLines={1}>
                  {book.author}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
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
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 10,
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
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    marginLeft: 10,
    marginRight: 10,
  },
  libraryShortcut: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 24,
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
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
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
    marginBottom: 16,
  },
  bannerButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  bannerButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 14,
  },
  categoriesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  categoryCard: {
    backgroundColor: colors.cardBackground,
    width: '22%',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 8,
  },
  categoryTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  recentBooksScroll: {
    flexDirection: 'row',
  },
  bookCard: {
    width: 110,
    marginRight: 14,
  },
  bookCover: {
    width: 110,
    height: 150,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookCoverImage: {
    width: 110,
    height: 150,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    marginBottom: 8,
  },
  loadingIndicator: {
    marginVertical: 24,
  },
  bookTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  bookAuthor: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});
