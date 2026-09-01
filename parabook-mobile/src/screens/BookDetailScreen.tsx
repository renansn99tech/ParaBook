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
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { Book, BookReview, bookService, getStatusLabel, LibraryStatus } from '../services/bookService';
import { extractApiErrorMessage } from '../services/authService';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reviews, setReviews] = useState<BookReview[]>([]);
  const [myRating, setMyRating] = useState(0);
  const [myReview, setMyReview] = useState('');
  const [savingReview, setSavingReview] = useState(false);
  const [removingFromLibrary, setRemovingFromLibrary] = useState(false);

  const fetchBookDetails = useCallback(async () => {
    if (!bookId) {
      setBook(null);
      setErrorMessage('Livro nao identificado.');
      setLoading(false);
      return;
    }

    try {
      setErrorMessage(null);
      const [bookData, shelfItem, reviewData] = await Promise.all([
        bookService.getBookById(bookId),
        bookService.getShelfItemByBook(bookId).catch(() => null),
        bookService.getBookReviews(bookId).catch(() => []),
      ]);
      setBook(bookData);
      setSelectedStatus(shelfItem?.status || null);
      setFavorite(Boolean(shelfItem?.favorite));
      setMyRating(shelfItem?.rating || 0);
      setMyReview(shelfItem?.review || '');
      setReviews(reviewData);
    } catch (error) {
      setBook(null);
      setErrorMessage('Nao foi possivel carregar os detalhes deste livro.');
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
      Alert.alert(
        'Nao foi possivel atualizar',
        extractApiErrorMessage(error, 'Verifique sua conexao e tente novamente.'),
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleStartReading = async () => {
    if (!bookId) return;
    if (!book?.pdfAvailable) {
      Alert.alert('Leitura indisponivel', 'Este livro nao possui um arquivo PDF disponivel.');
      return;
    }

    try {
      await bookService.updateBookStatus(bookId, 'lendo');
      setSelectedStatus('lendo');
      navigation.navigate('Reader', { bookId, title: book?.title || initialTitle });
    } catch (error) {
      Alert.alert(
        'Nao foi possivel iniciar a leitura',
        extractApiErrorMessage(error, 'Verifique sua conexao e tente novamente.'),
      );
    }
  };

  const handleToggleFavorite = async () => {
    if (!bookId) return;

    try {
      const item = await bookService.updateBookInteraction(bookId, { favorite: !favorite });
      setFavorite(Boolean(item.favorite));
    } catch (error) {
      Alert.alert(
        'Nao foi possivel favoritar',
        extractApiErrorMessage(error, 'Verifique sua conexao e tente novamente.'),
      );
    }
  };

  const removeFromLibrary = () => {
    if (!bookId || !selectedStatus) return;

    Alert.alert('Remover da biblioteca', 'Deseja remover este livro da sua estante?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          setRemovingFromLibrary(true);
          try {
            await bookService.removeFromLibrary(bookId);
            setSelectedStatus(null);
            setFavorite(false);
            setMyRating(0);
            setMyReview('');
            Alert.alert('Livro removido', 'O livro foi removido da sua biblioteca.');
          } catch (error) {
            Alert.alert(
              'Nao foi possivel remover',
              extractApiErrorMessage(error, 'Verifique sua conexao e tente novamente.'),
            );
          } finally {
            setRemovingFromLibrary(false);
          }
        },
      },
    ]);
  };

  const handleSaveReview = async () => {
    if (!bookId || myRating < 1) {
      Alert.alert('Escolha uma nota', 'Selecione de uma a cinco estrelas.');
      return;
    }
    setSavingReview(true);
    try {
      await bookService.updateBookInteraction(bookId, { rating: myRating, review: myReview.trim() });
      setReviews(await bookService.getBookReviews(bookId));
      Alert.alert('Avaliacao salva', 'Sua avaliacao foi publicada.');
    } catch {
      Alert.alert('Nao foi possivel salvar', 'Verifique sua conexao e tente novamente.');
    } finally {
      setSavingReview(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  if (!book) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]}>
        <Ionicons name="alert-circle-outline" size={46} color={colors.textMuted} />
        <Text style={styles.errorText}>{errorMessage || 'Livro nao encontrado.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => void fetchBookDetails()}>
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
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
          {book.title || initialTitle || 'Detalhes do Livro'}
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
          {book.cover_url ? (
            <Image source={{ uri: book.cover_url }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="book" size={60} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <Text style={styles.title}>{book.title}</Text>
          <Text style={styles.author}>{book.author}</Text>
          <View style={styles.metaRow}>
            {book.category && <Text style={styles.metaPill}>{book.category}</Text>}
            {book.pages && <Text style={styles.metaPill}>{book.pages} paginas</Text>}
            {book.year && <Text style={styles.metaPill}>{book.year}</Text>}
            {book.rating !== undefined && <Text style={styles.metaPill}>{book.rating.toFixed(1)} estrelas</Text>}
            {book.isbn && <Text style={styles.metaPill}>ISBN {book.isbn}</Text>}
            {book.origin && (
              <Text style={styles.metaPill}>
                {book.origin === 'autor_independente' ? 'Autor independente' : 'Dominio publico'}
              </Text>
            )}
          </View>
        </View>

        {book.pdfAvailable ? (
          <TouchableOpacity style={styles.readButton} onPress={handleStartReading} activeOpacity={0.8}>
            <Ionicons name="reader-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.readButtonText}>Ler agora</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.pdfUnavailable}>Leitura digital indisponivel para este titulo.</Text>
        )}

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
          {selectedStatus && (
            <TouchableOpacity
              style={styles.removeButton}
              onPress={removeFromLibrary}
              disabled={removingFromLibrary}
            >
              {removingFromLibrary ? (
                <ActivityIndicator color={colors.textSecondary} />
              ) : (
                <Text style={styles.removeButtonText}>Remover da biblioteca</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sua avaliacao</Text>
          <View style={styles.starsRow}>{[1, 2, 3, 4, 5].map((value) => <TouchableOpacity key={value} onPress={() => setMyRating(value)} hitSlop={6}><Ionicons name={value <= myRating ? 'star' : 'star-outline'} size={28} color={colors.starYellow} /></TouchableOpacity>)}</View>
          <TextInput style={styles.reviewInput} value={myReview} onChangeText={setMyReview} placeholder="Escreva uma resenha (opcional)" placeholderTextColor={colors.textMuted} multiline textAlignVertical="top" />
          <TouchableOpacity style={styles.saveReviewButton} onPress={handleSaveReview} disabled={savingReview}>{savingReview ? <ActivityIndicator color={colors.textPrimary} /> : <Text style={styles.saveReviewText}>Salvar avaliacao</Text>}</TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resenhas dos leitores</Text>
          {reviews.length === 0 ? <Text style={styles.description}>Este livro ainda nao recebeu resenhas.</Text> : reviews.map((review) => <View key={review.id} style={styles.reviewCard}><View style={styles.reviewHeader}><Text style={styles.reviewAuthor}>@{review.username}</Text><Text style={styles.reviewRating}>{review.rating ? `${review.rating}/5` : 'Sem nota'}</Text></View><Text style={styles.reviewBody}>{review.review || 'Avaliacao sem texto.'}</Text></View>)}
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
  pdfUnavailable: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
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
  removeButton: {
    minHeight: 42,
    marginTop: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  starsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  reviewInput: { minHeight: 96, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardBackground, color: colors.textPrimary, fontSize: 14 },
  saveReviewButton: { minHeight: 44, marginTop: 10, borderRadius: 22, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveReviewText: { color: colors.textPrimary, fontWeight: '700' },
  reviewCard: { padding: 13, marginBottom: 9, borderRadius: 10, backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.border },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reviewAuthor: { color: colors.textPrimary, fontSize: 13, fontWeight: '700' },
  reviewRating: { color: colors.starYellow, fontSize: 12, fontWeight: '700' },
  reviewBody: { color: colors.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 7 },
  errorText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 14,
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 18,
    minHeight: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
});
