import { getCollection } from './collection';
import { api, resolveDjangoUrl } from './api';

export type LibraryStatus = 'quero_ler' | 'lendo' | 'lido';

export interface Book {
  id: string | number;
  title: string;
  author: string;
  cover_url?: string;
  pages?: number;
  category?: string;
  rating?: number;
  year?: number;
  isbn?: string;
  pdfAvailable: boolean;
  origin?: 'dominio_publico' | 'autor_independente' | 'licenciado';
  publicationStatus?: 'pendente' | 'publicado' | 'rejeitado' | 'removido' | 'suspenso' | 'retirado';
}

export interface UserBookItem {
  id: string | number;
  book: Book;
  status: LibraryStatus;
  progress: number;
  favorite?: boolean;
  rating?: number | null;
  review?: string | null;
  currentPage: number;
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
  titulo: string;
  autor: string;
  capa_url?: string | null;
  paginas?: number | null;
  categoria_nome?: string | null;
  avaliacao?: number | string | null;
  ano_publicacao?: number | null;
  isbn?: string | null;
  pdf_disponivel?: boolean;
  origem?: 'dominio_publico' | 'autor_independente' | 'licenciado';
  status?: 'pendente' | 'publicado' | 'rejeitado' | 'removido' | 'suspenso' | 'retirado';
};

type DjangoShelfItem = {
  id: string | number;
  livro: string | number;
  livro_titulo: string;
  livro_autor: string;
  livro_capa?: string | null;
  livro_paginas?: number | null;
  livro_status?: Book['publicationStatus'];
  pagina_atual?: number;
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
  title: raw.titulo,
  author: raw.autor,
  cover_url: resolveDjangoUrl(raw.capa_url),
  pages: raw.paginas || undefined,
  category: raw.categoria_nome || undefined,
  rating: raw.avaliacao === null || raw.avaliacao === undefined ? undefined : Number(raw.avaliacao),
  year: raw.ano_publicacao || undefined,
  isbn: raw.isbn || undefined,
  pdfAvailable: Boolean(raw.pdf_disponivel),
  origin: raw.origem,
  publicationStatus: raw.status,
});

const normalizeShelfItem = (raw: DjangoShelfItem): UserBookItem => {
  const book = normalizeBook({
    id: raw.livro,
    titulo: raw.livro_titulo,
    autor: raw.livro_autor,
    capa_url: raw.livro_capa,
    paginas: raw.livro_paginas,
    pdf_disponivel: false,
    status: raw.livro_status,
  });

  const currentPage = raw.pagina_atual || 0;
  const totalPages = raw.livro_paginas || book.pages || 0;

  return {
    id: raw.id,
    book,
    status: raw.status,
    progress: raw.status === 'lido'
      ? 100
      : totalPages > 0 ? Math.min(100, Math.round((currentPage / totalPages) * 100)) : 0,
    favorite: raw.favorito,
    rating: raw.nota,
    review: raw.resenha,
    currentPage,
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
    const response = await getCollection(endpoint, search ? { search } : {});
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
    const response = await getCollection(endpoint);
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
    const response = await getCollection(endpoint);
    return parseCollection<{ id: string | number; nome: string }>(response.data, endpoint).map((category) => ({
      id: category.id,
      name: category.nome,
    }));
  },

  getUserLibrary: async (status?: LibraryStatus): Promise<UserBookItem[]> => {
    const endpoint = '/biblioteca/estante/';
    const response = await getCollection(endpoint, status ? { status } : {});
    return parseCollection<DjangoShelfItem>(response.data, endpoint).map(normalizeShelfItem);
  },

  getShelfItemByBook: async (bookId: string | number): Promise<UserBookItem | null> => {
    const endpoint = '/biblioteca/estante/';
    const response = await getCollection(endpoint, { livro: bookId });
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

  updateReadingProgress: async (shelfItemId: string | number, currentPage: number): Promise<UserBookItem> => {
    const response = await api.patch(`/biblioteca/estante/${shelfItemId}/`, {
      pagina_atual: currentPage,
    });
    return normalizeShelfItem(response.data);
  },

  removeFromLibrary: async (bookId: string | number): Promise<boolean> => {
    const currentItem = await bookService.getShelfItemByBook(bookId);
    if (!currentItem) return false;
    await api.delete(`/biblioteca/estante/${currentItem.id}/`);
    return true;
  },
};
