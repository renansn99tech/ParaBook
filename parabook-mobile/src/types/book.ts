    export type ReadingStatus = 'WANT_TO_READ' | 'READING' | 'COMPLETED' | 'DROPPED' | null;

    export interface Book {
    id: string;
    title: string;
    author: string;
    category: string;
    rating: number;
    pages: number;
    synopsis: string;
    coverUrl?: string;
    isBookmarked?: boolean;
    status?: ReadingStatus;
    }