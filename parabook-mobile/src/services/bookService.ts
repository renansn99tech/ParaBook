import { api } from './api';

export interface Book {
  id: string | number;
  title: string;
  author: string;
  cover_url?: string;
  description?: string;
}

export interface Category {
  id: string | number;
  name: string;
}

export const bookService = {
  getFeaturedBooks: async (): Promise<Book[]> => {
    try {
      const response = await api.get('/books/');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar livros:', error);
      throw error;
    }
  },

  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await api.get('/categories/');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  },
};