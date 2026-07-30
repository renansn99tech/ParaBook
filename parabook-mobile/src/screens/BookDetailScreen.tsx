import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { bookService, Book, LibraryStatus } from '../services/bookService';

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

// Fallback de demonstração caso a API Django não retorne os detalhes do livro
const FALLBACK_BOOK: Book = {
  id: '1',
  title: 'Detalhes do Livro',
  author: 'Autor Desconhecido',
  description:
    'Esta é uma descrição genérica de exibição. Quando a API REST do Django estiver online, os dados reais do MySQL serão carregados nesta tela.',
  pages: 320,
};

export const BookDetailScreen = ({ route, navigation }: Props) => {
  const { bookId, title: initialTitle } = route.params || {};

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedStatus, setSelectedStatus] = useState<LibraryStatus | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);

  // Busca os detalhes do livro via API
  const fetchBookDetails = useCallback(async () => {
    if (!bookId) {
      setBook(FALLBACK_BOOK);
      setLoading(false);
      return;
    }

    try {
      const data = await bookService.getBookById(bookId);
      setBook(data);
    } catch (error) {
      console.warn(`Falha ao buscar livro ${bookId} na API. Usando dados locais.`);
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

  // Atualiza o status do livro na biblioteca do usuário
  const handleUpdateStatus = async (status: LibraryStatus) => {
    if (!bookId) return;

    setUpdatingStatus(true);
    try {
      await bookService.updateBookStatus(bookId, status);
      setSelectedStatus(status);
      Alert.alert('Sucesso', 'Status do livro atualizado na sua biblioteca!');
    } catch (error) {
      // Atualização local de feedback para desenvolvimento
      setSelectedStatus(status);
      Alert.alert('Aviso', 'Status atualizado localmente (offline).');
    } finally {
      setUpdatingStatus(false);
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
      {/* Header */}
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
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Capa do Livro */}
        <View style={styles.coverContainer}>
          <View style={styles.coverPlaceholder}>
            <Ionicons name="book" size={60} color={colors.primary} />
          </View>
        </View>

        {/* Informações Básicas */}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{book?.title}</Text>
          <Text style={styles.author}>{book?.author}</Text>
          {book?.pages && <Text style={styles.pagesText}>{book.pages} páginas</Text>}
        </View>

        {/* Seleção de Status da Leitura */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status de Leitura</Text>
          <View style={styles.statusButtonsContainer}>
            <TouchableOpacity
              style={[
                styles.statusButton,
                selectedStatus === 'want_to_read' && styles.statusButtonActive,
              ]}
              disabled={updatingStatus}
              onPress={() => handleUpdateStatus('want_to_read')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="bookmark-outline"
                size={18}
                color={selectedStatus === 'want_to_read' ? '#FFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.statusButtonText,
                  selectedStatus === 'want_to_read' && styles.statusButtonTextActive,
                ]}
              >
                Quero Ler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                selectedStatus === 'reading' && styles.statusButtonActive,
              ]}
              disabled={updatingStatus}
              onPress={() => handleUpdateStatus('reading')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="book-outline"
                size={18}
                color={selectedStatus === 'reading' ? '#FFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.statusButtonText,
                  selectedStatus === 'reading' && styles.statusButtonTextActive,
                ]}
              >
                Lendo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusButton,
                selectedStatus === 'completed' && styles.statusButtonActive,
              ]}
              disabled={updatingStatus}
              onPress={() => handleUpdateStatus('completed')}
              activeOpacity={0.7}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={selectedStatus === 'completed' ? '#FFF' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.statusButtonText,
                  selectedStatus === 'completed' && styles.statusButtonTextActive,
                ]}
              >
                Lido
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sinopse / Descrição */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sinopse</Text>
          <Text style={styles.description}>
            {book?.description || 'Nenhuma descrição fornecida para este livro.'}
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
  headerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerPlaceholder: {
    width: 24,
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
    width: 120,
    height: 170,
    backgroundColor: colors.cardBackground,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoContainer: {
    alignItems: 'center',
    marginBottom: 24,
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
  pagesText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
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
    color: '#FFF',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
});