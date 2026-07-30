import React from 'react';
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

type Props = NativeStackScreenProps<RootStackParamList, 'BookDetail'>;

export const BookDetailScreen = ({ route, navigation }: Props) => {
  const { bookId, title } = route.params;

  // Em etapas futuras, buscaremos os dados detalhados via API usando o bookId
  const bookData = {
    id: bookId,
    title: title || 'Título do Livro',
    author: 'Autor Exemplo',
    category: 'Ficção',
    rating: '4.8',
    pages: '310',
    synopsis:
      'Esta é uma sinopse de exemplo do livro selecionado no Parabook. Aqui o leitor poderá visualizar um resumo completo da obra, opiniões da comunidade e iniciar sua leitura ou salvar na biblioteca pessoal.',
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Superior com Botão de Voltar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalhes do Livro</Text>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="bookmark-outline" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Capa do Livro em Destaque */}
        <View style={styles.coverContainer}>
          <View style={styles.coverPlaceholder}>
            <Ionicons name="book" size={64} color={colors.primary} />
          </View>
        </View>

        {/* Informações Principais */}
        <Text style={styles.title}>{bookData.title}</Text>
        <Text style={styles.author}>por {bookData.author}</Text>

        {/* Métricas do Livro */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Ionicons name="star" size={18} color="#F59E0B" />
            <Text style={styles.statValue}>{bookData.rating}</Text>
            <Text style={styles.statLabel}>Avaliação</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={18} color={colors.primary} />
            <Text style={styles.statValue}>{bookData.pages}</Text>
            <Text style={styles.statLabel}>Páginas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="pricetag-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.statValue}>{bookData.category}</Text>
            <Text style={styles.statLabel}>Gênero</Text>
          </View>
        </View>

        {/* Sinopse */}
        <View style={styles.synopsisContainer}>
          <Text style={styles.sectionTitle}>Sinopse</Text>
          <Text style={styles.synopsisText}>{bookData.synopsis}</Text>
        </View>
      </ScrollView>

      {/* Botão Fixo de Ação */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.readButton}>
          <Ionicons name="book-outline" size={20} color={colors.textPrimary} />
          <Text style={styles.readButtonText}>Iniciar Leitura</Text>
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
    marginVertical: 24,
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