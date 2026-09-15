import React, { useEffect, useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { Book, bookService } from '../services/bookService';
import { BookCover } from '../components/BookCover';
import { EmptyState } from '../components/EmptyState';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const ExploreScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      setLoading(true);
      setErrorMessage(null);
      try {
        const data = await bookService.getBooks(search.trim() || undefined);
        setBooks(data);
      } catch (error) {
        setBooks([]);
        setErrorMessage('Não foi possível buscar livros agora.');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

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

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{search.trim() ? 'Resultados' : 'Livros em destaque'}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : errorMessage ? (
        <View style={styles.stateWrapper}><EmptyState icon="cloud-offline-outline" title="Catálogo indisponível" description={errorMessage} /></View>
      ) : (
        <FlatList
          data={books}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.stateWrapper}>
              <EmptyState icon="search-outline" title="Nenhum livro encontrado" description="Tente buscar por outro título ou autor." />
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.bookItem}
              onPress={() => handleBookPress(String(item.id), item.title)}
            >
              <BookCover uri={item.cover_url} width={52} height={76} />
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
