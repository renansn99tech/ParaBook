import React from 'react';
import {
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

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const EXPLORE_BOOKS = [
  { id: '1', title: 'O Senhor dos Anéis', author: 'J.R.R. Tolkien', category: 'Fantasia' },
  { id: '2', title: 'Admirável Mundo Novo', author: 'Aldous Huxley', category: 'Ficção Científica' },
  { id: '3', title: 'O Poder do Hábito', author: 'Charles Duhigg', category: 'Desenvolvimento' },
  { id: '4', title: 'Sapiens', author: 'Yuval Noah Harari', category: 'História' },
];

export const ExploreScreen = () => {
  const navigation = useNavigation<NavigationProp>();

  const handleBookPress = (bookId: string, title: string) => {
    navigation.navigate('BookDetail', { bookId, title });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Explorar</Text>
          <Text style={styles.subtitle}>Encontre seu próximo livro favorito</Text>
        </View>

        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar por título, autor ou gênero..."
            placeholderTextColor={colors.textMuted}
          />
        </View>

        {/* Lista de Livros */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Livros em Destaque</Text>
        </View>

        {EXPLORE_BOOKS.map((book) => (
          <TouchableOpacity
            key={book.id}
            style={styles.bookItem}
            onPress={() => handleBookPress(book.id, book.title)}
          >
            <View style={styles.bookIconContainer}>
              <Ionicons name="book-outline" size={28} color={colors.primary} />
            </View>
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle}>{book.title}</Text>
              <Text style={styles.bookAuthor}>{book.author}</Text>
              <Text style={styles.bookCategory}>{book.category}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}

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
    marginBottom: 20,
    marginTop: 10,
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
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    marginLeft: 10,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  bookItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  bookInfo: {
    flex: 1,
  },
  bookTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.textPrimary,
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