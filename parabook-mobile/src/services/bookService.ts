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

export interface BookReview {
  id: string | number;
  username: string;
  userPhoto?: string;
  rating?: number | null;
  review: string;
  createdAt?: string;
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

const parseCollection = <T>(payload: unknown, endpoint: string): T[] => {
  if (Array.isArray(payload)) return payload as T[];

  if (payload && typeof payload === 'object' && 'results' in payload) {
    const results = (payload as { results?: unknown }).results;
    if (Array.isArray(results)) return results as T[];
  }

  throw new Error(`Contrato inesperado em ${endpoint}: era esperada uma lista ou uma pagina com results.`);
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
  getBooks: async (search?: string): Promise<Book[]> => {
    const endpoint = '/biblioteca/livros/';
    const response = await api.get(endpoint, {
      params: search ? { search } : {},
    });
    return parseCollection<DjangoBook>(response.data, endpoint).map(normalizeBook);
  },

  getBookById: async (id: string | number): Promise<Book> => {
    const response = await api.get(`/biblioteca/livros/${id}/`);
    return normalizeBook(response.data);
  },

  getBookPdfUrl: (id: string | number): string => {
    return api.getUri({ url: `/biblioteca/livros/${id}/ler_pdf/` });
  },

  getBookReviews: async (id: string | number): Promise<BookReview[]> => {
    const endpoint = `/biblioteca/livros/${id}/resenhas/`;
    const response = await api.get(endpoint);
    return parseCollection<Record<string, unknown>>(response.data, endpoint).map((raw) => ({
      id: raw.id as string | number,
      username: String(raw.usuario_nome || 'Leitor'),
      userPhoto: resolveDjangoUrl(raw.usuario_foto as string | null),
      rating: raw.nota === null || raw.nota === undefined ? null : Number(raw.nota),
      review: String(raw.resenha || ''),
      createdAt: raw.data_adicao ? String(raw.data_adicao) : undefined,
    }));
  },

  getCategories: async (): Promise<Category[]> => {
    const endpoint = '/biblioteca/categorias/';
    const response = await api.get(endpoint);
    return parseCollection<{ id: string | number; nome?: string; name?: string }>(response.data, endpoint).map((category) => ({
      id: category.id,
      name: category.nome || category.name || 'Categoria',
    }));
  },

  getUserLibrary: async (status?: LibraryStatus): Promise<UserBookItem[]> => {
    const endpoint = '/biblioteca/estante/';
    const response = await api.get(endpoint, {
      params: status ? { status } : {},
    });
    return parseCollection<DjangoShelfItem>(response.data, endpoint).map(normalizeShelfItem);
  },

  getShelfItemByBook: async (bookId: string | number): Promise<UserBookItem | null> => {
    const endpoint = '/biblioteca/estante/';
    const response = await api.get(endpoint, {
      params: { livro: bookId },
    });
    const items = parseCollection<DjangoShelfItem>(response.data, endpoint).map(normalizeShelfItem);
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
