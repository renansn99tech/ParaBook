import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { colors } from '../theme/colors';

const CATEGORIES = ['Todos', 'Ficção', 'Romance', 'Tecnologia', 'História', 'Fantasia', 'Negócios'];

const MOCK_EXPLORE_BOOKS = [
  { id: '1', title: 'O Hobbit', author: 'J.R.R. Tolkien', category: 'Fantasia', rating: '4.9' },
  { id: '2', title: '1984', author: 'George Orwell', category: 'Ficção', rating: '4.8' },
  { id: '3', title: 'Clean Code', author: 'Robert C. Martin', category: 'Tecnologia', rating: '4.7' },
  { id: '4', title: 'Sapiens', author: 'Yuval Noah Harari', category: 'História', rating: '4.9' },
  { id: '5', title: 'Duna', author: 'Frank Herbert', category: 'Ficção', rating: '4.8' },
];

export const ExploreScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredBooks = MOCK_EXPLORE_BOOKS.filter((book) => {
    const matchesCategory = selectedCategory === 'Todos' || book.category === selectedCategory;
    const matchesSearch =
      book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explorar Biblioteca</Text>
      </View>

      {/* Barra de Pesquisa */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por livro, autor ou gênero..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Categorias (Horizontal) */}
      <View style={styles.categoriesWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
          {CATEGORIES.map((category) => {
            const isSelected = selectedCategory === category;
            return (
              <TouchableOpacity
                key={category}
                style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>
                  {category}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Lista de Resultados */}
      <FlatList
        data={filteredBooks}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>Nenhum livro encontrado</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookCard}
            onPress={() => navigation.navigate('BookDetail', { bookId: item.id, title: item.title })}
          >
            <View style={styles.bookCover}>
              <Ionicons name="book" size={32} color={colors.primary} />
            </View>
            <View style={styles.bookInfo}>
              <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
              <Text style={styles.bookAuthor}>{item.author}</Text>
              <View style={styles.bookMeta}>
                <View style={styles.tag}>
                  <Text style={styles.tagText}>{item.category}</Text>
                </View>
                <View style={styles.ratingContainer}>
                  <Ionicons name="star" size={14} color="#F59E0B" />
                  <Text style={styles.ratingText}>{item.rating}</Text>
                </View>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
  },
  categoriesWrapper: {
    marginBottom: 12,
  },
  categoriesList: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.cardBackground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  categoryTextSelected: {
    color: colors.textPrimary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  bookCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookCover: {
    width: 50,
    height: 70,
    backgroundColor: colors.background,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  bookInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
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
  bookMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },
  tag: {
    backgroundColor: colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: colors.textMuted,
    marginTop: 8,
    fontSize: 14,
  },
});