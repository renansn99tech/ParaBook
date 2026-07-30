import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';
import { Book, ReadingStatus } from '../types/book';

// Forçamos o fallback caso o RootStackParamList esteja preso no cache
type BookDetailRouteParams = {
  bookId: string;
  title?: string;
  book?: Book;
};

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

export const BookDetailScreen = ({ route, navigation }: Props) => {
  // Fazemos o cast explícito aqui para destravar o TypeScript imediatamente:
  const params = (route.params || {}) as BookDetailRouteParams;
  const bookId = params.bookId || '1';
  const title = params.title || 'Título do Livro';
  const initialBook = params.book;

  const [book] = useState<Book>(
    initialBook || {
      id: bookId,
      title: title,
      author: 'Autor Exemplo',
      category: 'Ficção',
      rating: 4.8,
      pages: 310,
      synopsis:
        'Esta é uma sinopse de exemplo do livro selecionado no Parabook. Aqui o leitor poderá visualizar um resumo completo da obra, opiniões da comunidade e iniciar sua leitura ou salvar na biblioteca pessoal.',
      coverUrl: undefined,
      isBookmarked: false,
      status: null,
    }
  );

  const [isBookmarked, setIsBookmarked] = useState<boolean>(book.isBookmarked || false);
  const [currentStatus, setCurrentStatus] = useState<ReadingStatus>(book.status || null);

  const toggleBookmark = () => {
    setIsBookmarked((prev) => !prev);
  };

  const handleStatusChange = (newStatus: ReadingStatus) => {
    setCurrentStatus(newStatus);
  };

  const getStatusButtonLabel = () => {
    switch (currentStatus) {
      case 'READING':
        return 'Lendo Atualmente';
      case 'COMPLETED':
        return 'Leitura Concluída';
      case 'WANT_TO_READ':
        return 'Na Lista de Desejos';
      default:
        return 'Adicionar à Biblioteca';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Superior */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Livro</Text>
        <TouchableOpacity onPress={toggleBookmark} style={styles.iconButton}>
          <Ionicons
            name={isBookmarked ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isBookmarked ? colors.primary : colors.textPrimary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Capa */}
        <View style={styles.coverContainer}>
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Ionicons name="book" size={64} color={colors.primary} />
            </View>
          )}
        </View>

        {/* Informações */}
        <Text style={styles.title}>{book.title}</Text>
        <Text style={styles.author}>por {book.author}</Text>

        {/* Métricas */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={styles.statValue}>{(book.rating ?? 0).toFixed(1)}</Text>
            <Text style={styles.statLabel}>Avaliação</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={styles.statValue}>{book.pages ?? 0}</Text>
            <Text style={styles.statLabel}>Páginas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.statValue}>{book.category ?? 'N/A'}</Text>
            <Text style={styles.statLabel}>Gênero</Text>
          </View>
        </View>

        {/* Status de Leitura */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Status de Leitura</Text>
          <View style={styles.statusOptions}>
            <TouchableOpacity
              style={[
                styles.statusChip,
                currentStatus === 'WANT_TO_READ' && styles.statusChipActive,
              ]}
              onPress={() => handleStatusChange('WANT_TO_READ')}
            >
              <Text
                style={[
                  styles.statusChipText,
                  currentStatus === 'WANT_TO_READ' && styles.statusChipTextActive,
                ]}
              >
                Quero Ler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusChip,
                currentStatus === 'READING' && styles.statusChipActive,
              ]}
              onPress={() => handleStatusChange('READING')}
            >
              <Text
                style={[
                  styles.statusChipText,
                  currentStatus === 'READING' && styles.statusChipTextActive,
                ]}
              >
                Lendo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.statusChip,
                currentStatus === 'COMPLETED' && styles.statusChipActive,
              ]}
              onPress={() => handleStatusChange('COMPLETED')}
            >
              <Text
                style={[
                  styles.statusChipText,
                  currentStatus === 'COMPLETED' && styles.statusChipTextActive,
                ]}
              >
                Lido
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Sinopse */}
        <View style={styles.synopsisContainer}>
          <Text style={styles.sectionTitle}>Sinopse</Text>
          <Text style={styles.synopsisText}>{book.synopsis}</Text>
        </View>
      </ScrollView>

      {/* Botão Fixo */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.readButton,
            currentStatus && { backgroundColor: colors.cardBackground, borderWidth: 1, borderColor: colors.primary },
          ]}
          onPress={() => handleStatusChange(currentStatus === 'READING' ? null : 'READING')}
        >
          <Ionicons
            name={currentStatus === 'READING' ? 'pause-circle-outline' : 'book-outline'}
            size={20}
            color={colors.textPrimary}
          />
          <Text style={styles.readButtonText}>{getStatusButtonLabel()}</Text>
        </TouchableOpacity>
      </View>
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
  iconButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  coverContainer: {
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  coverImage: {
    width: 140,
    height: 200,
    borderRadius: 12,
  },
  coverPlaceholder: {
    width: 140,
    height: 200,
    borderRadius: 12,
    backgroundColor: colors.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginTop: 16,
  },
  author: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    marginVertical: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  statusSection: {
    width: '100%',
    marginBottom: 20,
  },
  statusOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  statusChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statusChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  statusChipTextActive: {
    color: colors.textPrimary,
  },
  synopsisContainer: {
    width: '100%',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  synopsisText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  readButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
  },
  readButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});