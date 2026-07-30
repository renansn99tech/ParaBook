import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';

export const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* Header - Saudação */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingTitle}>Olá, Rodrigo! 👋</Text>
            <Text style={styles.greetingSubtitle}>O que você vai ler hoje?</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>R</Text>
          </View>
        </View>

        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <Ionicons name="search-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar livros, autores, categorias..."
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity>
            <Ionicons name="options-outline" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Banner Destaque */}
        <View style={styles.banner}>
          <Text style={styles.bannerBadge}>DESTAQUE</Text>
          <Text style={styles.bannerTitle}>Descubra novos mundos</Text>
          <Text style={styles.bannerSubtitle}>Explore milhares de livros e amplie seus horizontes.</Text>
          <TouchableOpacity style={styles.bannerButton}>
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
          <View style={styles.categoryCard}>
            <Ionicons name="book-outline" size={24} color={colors.primary} />
            <Text style={styles.categoryTitle}>Ficção</Text>
          </View>
          <View style={styles.categoryCard}>
            <Ionicons name="school-outline" size={24} color="#10B981" />
            <Text style={styles.categoryTitle}>Filosofia</Text>
          </View>
          <View style={styles.categoryCard}>
            <Ionicons name="flask-outline" size={24} color="#EC4899" />
            <Text style={styles.categoryTitle}>Ciência</Text>
          </View>
          <View style={styles.categoryCard}>
            <Ionicons name="hourglass-outline" size={24} color="#F59E0B" />
            <Text style={styles.categoryTitle}>História</Text>
          </View>
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
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    marginLeft: 10,
    marginRight: 10,
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
});