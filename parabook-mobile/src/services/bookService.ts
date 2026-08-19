import { api, resolveDjangoUrl } from './api';

export type LibraryStatus = 'quero_ler' | 'lendo' | 'lido';

export interface Book {
  id: string | number;
  title: string;
  author: string;
  cover_url?: string;
  description?: string;
  pages?: number;
  category?: string;
  rating?: number;
  year?: number;
  isbn?: string;
  pdf_url?: string;
}

export interface UserBookItem {
  id: string | number;
  book: Book;
  status: LibraryStatus;
  progress: number;
  favorite?: boolean;
  rating?: number | null;
  review?: string | null;
}

export interface Category {
  id: string | number;
  name: string;
}

type DjangoBook = {
  id: string | number;
  titulo?: string;
  title?: string;
  autor?: string;
  author?: string;
  capa_url?: string | null;
  cover_url?: string | null;
  descricao?: string | null;
  description?: string | null;
  paginas?: number | null;
  pages?: number | null;
  categoria_nome?: string | null;
  category?: string | null;
  avaliacao?: number | string | null;
  ano_publicacao?: number | null;
  isbn?: string | null;
};

type DjangoShelfItem = {
  id: string | number;
  livro?: string | number;
  book?: DjangoBook;
  livro_titulo?: string;
  livro_autor?: string;
  livro_capa?: string | null;
  status: LibraryStatus;
  favorito?: boolean;
  nota?: number | null;
  resenha?: string | null;
};

const asArray = <T>(payload: T[] | { results?: T[] }): T[] => {
  if (Array.isArray(payload)) return payload;
  return payload.results || [];
};

const normalizeBook = (raw: DjangoBook): Book => ({
  id: raw.id,
  title: raw.titulo || raw.title || 'Livro sem titulo',
  author: raw.autor || raw.author || 'Autor desconhecido',
  cover_url: resolveDjangoUrl(raw.capa_url || raw.cover_url),
  description: raw.descricao || raw.description || undefined,
  pages: raw.paginas || raw.pages || undefined,
  category: raw.categoria_nome || raw.category || undefined,
  rating: raw.avaliacao === null || raw.avaliacao === undefined ? undefined : Number(raw.avaliacao),
  year: raw.ano_publicacao || undefined,
  isbn: raw.isbn || undefined,
});

const normalizeShelfItem = (raw: DjangoShelfItem): UserBookItem => {
  const nestedBook = raw.book;
  const book = nestedBook
    ? normalizeBook(nestedBook)
    : normalizeBook({
        id: raw.livro || raw.id,
        titulo: raw.livro_titulo,
        autor: raw.livro_autor,
        capa_url: raw.livro_capa,
      });

  return {
    id: raw.id,
    book,
    status: raw.status,
    progress: raw.status === 'lido' ? 100 : 0,
    favorite: raw.favorito,
    rating: raw.nota,
    review: raw.resenha,
  };
};

export const getStatusLabel = (status: LibraryStatus) => {
  if (status === 'lendo') return 'Lendo';
  if (status === 'lido') return 'Lido';
  return 'Quero Ler';
};

export const bookService = {
  getFeaturedBooks: async (search?: string): Promise<Book[]> => {
    const response = await api.get('/biblioteca/livros/', {
      params: search ? { search } : {},
    });
    return asArray<DjangoBook>(response.data).map(normalizeBook);
  },

  getBookById: async (id: string | number): Promise<Book> => {
    const response = await api.get(`/biblioteca/livros/${id}/`);
    return normalizeBook(response.data);
  },

  getBookPdfUrl: (id: string | number): string => {
    return api.getUri({ url: `/biblioteca/livros/${id}/ler_pdf/` });
  },

  getCategories: async (): Promise<Category[]> => {
    const response = await api.get('/biblioteca/categorias/');
    return asArray<{ id: string | number; nome?: string; name?: string }>(response.data).map((category) => ({
      id: category.id,
      name: category.nome || category.name || 'Categoria',
    }));
  },

  getUserLibrary: async (status?: LibraryStatus): Promise<UserBookItem[]> => {
    const response = await api.get('/biblioteca/estante/', {
      params: status ? { status } : {},
    });
    return asArray<DjangoShelfItem>(response.data).map(normalizeShelfItem);
  },

  getShelfItemByBook: async (bookId: string | number): Promise<UserBookItem | null> => {
    const response = await api.get('/biblioteca/estante/', {
      params: { livro: bookId },
    });
    const items = asArray<DjangoShelfItem>(response.data).map(normalizeShelfItem);
    return items[0] || null;
  },

  updateBookStatus: async (bookId: string | number, status: LibraryStatus): Promise<UserBookItem> => {
    const currentItem = await bookService.getShelfItemByBook(bookId);

    if (currentItem) {
      const response = await api.patch(`/biblioteca/estante/${currentItem.id}/`, { status });
      return normalizeShelfItem(response.data);
    }

    const response = await api.post('/biblioteca/estante/', {
      livro: bookId,
      status,
    });
    return normalizeShelfItem(response.data);
  },

  updateBookInteraction: async (
    bookId: string | number,
    data: { favorite?: boolean; rating?: number; review?: string; status?: LibraryStatus }
  ): Promise<UserBookItem> => {
    const currentItem = await bookService.getShelfItemByBook(bookId);
    const updatePayload = {
      favorito: data.favorite,
      nota: data.rating,
      resenha: data.review,
      status: data.status,
    };

    if (currentItem) {
      const response = await api.patch(`/biblioteca/estante/${currentItem.id}/`, updatePayload);
      return normalizeShelfItem(response.data);
    }

    const response = await api.post('/biblioteca/estante/', {
      livro: bookId,
      status: data.status || 'quero_ler',
      favorito: data.favorite,
      nota: data.rating,
      resenha: data.review,
    });
    return normalizeShelfItem(response.data);
  },
};
