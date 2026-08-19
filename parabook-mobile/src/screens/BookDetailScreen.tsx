import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { Book, bookService, getStatusLabel, LibraryStatus } from '../services/bookService';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

const FALLBACK_BOOK: Book = {
  id: '1',
  title: 'Detalhes do Livro',
  author: 'Autor Desconhecido',
  description:
    'Quando a API Django estiver online, os dados reais do acervo serao carregados nesta tela.',
  pages: 320,
};

const STATUS_OPTIONS: Array<{ status: LibraryStatus; icon: keyof typeof Ionicons.glyphMap }> = [
  { status: 'quero_ler', icon: 'bookmark-outline' },
  { status: 'lendo', icon: 'book-outline' },
  { status: 'lido', icon: 'checkmark-circle-outline' },
];

export const BookDetailScreen = ({ route, navigation }: Props) => {
  const { bookId, title: initialTitle } = route.params || {};

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<LibraryStatus | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [favorite, setFavorite] = useState(false);

  const fetchBookDetails = useCallback(async () => {
    if (!bookId) {
      setBook(FALLBACK_BOOK);
      setLoading(false);
      return;
    }

    try {
      const [bookData, shelfItem] = await Promise.all([
        bookService.getBookById(bookId),
        bookService.getShelfItemByBook(bookId).catch(() => null),
      ]);
      setBook(bookData);
      setSelectedStatus(shelfItem?.status || null);
      setFavorite(Boolean(shelfItem?.favorite));
    } catch (error) {
      setBook({
        ...FALLBACK_BOOK,
        id: bookId,
        title: initialTitle || FALLBACK_BOOK.title,
      });
    } finally {
      setLoading(false);
    }
  }, [bookId, initialTitle]);

  useEffect(() => {
    fetchBookDetails();
  }, [fetchBookDetails]);

  const handleUpdateStatus = async (status: LibraryStatus) => {
    if (!bookId) return;

    setUpdatingStatus(true);
    try {
      const item = await bookService.updateBookStatus(bookId, status);
      setSelectedStatus(item.status);
      Alert.alert('Estante atualizada', `Livro marcado como ${getStatusLabel(item.status).toLowerCase()}.`);
    } catch (error) {
      Alert.alert('Login necessario', 'Entre para atualizar sua biblioteca.');
      navigation.navigate('Login');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStartReading = async () => {
    if (!bookId) return;

    try {
      await bookService.updateBookStatus(bookId, 'lendo');
      setSelectedStatus('lendo');
      navigation.navigate('Reader', { bookId, title: book?.title || initialTitle });
    } catch (error) {
      navigation.navigate('Reader', { bookId, title: book?.title || initialTitle });
    }
  };

  const handleToggleFavorite = async () => {
    if (!bookId) return;

    try {
      const item = await bookService.updateBookInteraction(bookId, { favorite: !favorite });
      setFavorite(Boolean(item.favorite));
    } catch (error) {
      Alert.alert('Login necessario', 'Entre para favoritar livros.');
      navigation.navigate('Login');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {book?.title || initialTitle || 'Detalhes do Livro'}
        </Text>
        <TouchableOpacity
          onPress={handleToggleFavorite}
          style={styles.favoriteHeaderButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={favorite ? 'heart' : 'heart-outline'}
            size={22}
            color={favorite ? '#EC4899' : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.coverContainer}>
          {book?.cover_url ? (
            <Image source={{ uri: book.cover_url }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="book" size={60} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title}>{book?.title}</Text>
          <Text style={styles.author}>{book?.author}</Text>
          <View style={styles.metaRow}>
            {book?.category && <Text style={styles.metaPill}>{book.category}</Text>}
            {book?.pages && <Text style={styles.metaPill}>{book.pages} paginas</Text>}
            {book?.rating !== undefined && <Text style={styles.metaPill}>{book.rating.toFixed(1)} estrelas</Text>}
          </View>
        </View>

        <TouchableOpacity style={styles.readButton} onPress={handleStartReading} activeOpacity={0.8}>
          <Ionicons name="reader-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.readButtonText}>Ler agora</Text>
        </TouchableOpacity>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status de Leitura</Text>
          <View style={styles.statusButtonsContainer}>
            {STATUS_OPTIONS.map((option) => {
              const active = selectedStatus === option.status;
              return (
                <TouchableOpacity
                  key={option.status}
                  style={[styles.statusButton, active && styles.statusButtonActive]}
                  disabled={updatingStatus}
                  onPress={() => handleUpdateStatus(option.status)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={option.icon}
                    size={18}
                    color={active ? colors.textPrimary : colors.textSecondary}
                  />
                  <Text style={[styles.statusButtonText, active && styles.statusButtonTextActive]}>
                    {getStatusLabel(option.status)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sinopse</Text>
          <Text style={styles.description}>
            {book?.description || 'Nenhuma descricao fornecida para este livro.'}
          </Text>
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
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
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
  favoriteHeaderButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  coverContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  coverPlaceholder: {
    width: 128,
    height: 184,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  coverImage: {
    width: 128,
    height: 184,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  author: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  metaPill: {
    fontSize: 11,
    color: colors.textMuted,
    backgroundColor: colors.cardBackground,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  readButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  readButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    backgroundColor: colors.cardBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusButtonTextActive: {
    color: colors.textPrimary,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});
