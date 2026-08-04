import { api } from './api';

export type LibraryStatus = 'reading' | 'want_to_read' | 'completed';

export interface Book {
  id: string | number;
  title: string;
  author: string;
  cover_url?: string;
  description?: string;
  pages?: number;
}

export interface UserBookItem {
  id: string | number;
  book: Book;
  status: LibraryStatus;
  progress: number; // Porcentagem de leitura (0 a 100)
}

export interface Category {
  id: string | number;
  name: string;
}

export const bookService = {
  // Busca todos os livros em destaque / catálogo geral
  getFeaturedBooks: async (): Promise<Book[]> => {
    try {
      const response = await api.get('/books/');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar livros:', error);
      throw error;
    }
  },

  // Busca detalhes de um livro específico por ID
  getBookById: async (id: string | number): Promise<Book> => {
    try {
      const response = await api.get(`/books/${id}/`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar o livro ${id}:`, error);
      throw error;
    }
  },

  // Busca todas as categorias
  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await api.get('/categories/');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      throw error;
    }
  },

  // Busca a biblioteca do usuário autenticado (pode filtrar por status)
  getUserLibrary: async (status?: LibraryStatus): Promise<UserBookItem[]> => {
    try {
      const response = await api.get('/user/library/', {
        params: status ? { status } : {},
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar biblioteca do usuário:', error);
      throw error;
    }
  },

  // Atualiza ou adiciona o status de um livro na biblioteca do usuário
  updateBookStatus: async (
    bookId: string | number,
    status: LibraryStatus,
    progress: number = 0
  ): Promise<UserBookItem> => {
    try {
      const response = await api.post('/user/library/', {
        book_id: bookId,
        status,
        progress,
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar status do livro:', error);
      throw error;
    }
  },
};