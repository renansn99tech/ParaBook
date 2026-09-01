import { api, resolveDjangoUrl } from './api';

const asArray = <T>(payload: T[] | { results?: T[] }): T[] => Array.isArray(payload) ? payload : payload.results || [];

export type AuthorSummary = {
  id: string | number;
  username: string;
  name: string;
  photo?: string;
  biography?: string;
  totalBooks: number;
};

export type NotificationItem = {
  id: string | number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt?: string;
};

export type Achievement = {
  id: string | number;
  name: string;
  description: string;
  category?: string;
  points: number;
  unlocked: boolean;
};

export type RankingEntry = {
  position: number;
  username: string;
  xp: number;
  level: number;
  isCurrentUser: boolean;
};

export const featureService = {
  getAuthors: async (): Promise<AuthorSummary[]> => {
    const response = await api.get('/perfis/autores/');
    return asArray<Record<string, unknown>>(response.data).map((raw) => ({
      id: raw.id as string | number,
      username: String(raw.username || ''),
      name: String(raw.nome || raw.username || ''),
      photo: resolveDjangoUrl(raw.foto as string | null),
      biography: String(raw.biografia || ''),
      totalBooks: Number(raw.total_obras || 0),
    }));
  },

  getNotifications: async (): Promise<NotificationItem[]> => {
    const response = await api.get('/notificacoes/');
    return asArray<Record<string, unknown>>(response.data).map((raw) => ({
      id: raw.id as string | number,
      title: String(raw.titulo || raw.tipo || 'Notificacao'),
      message: String(raw.mensagem || ''),
      type: String(raw.tipo || 'sistema'),
      read: Boolean(raw.lida),
      createdAt: raw.criada_em ? String(raw.criada_em) : raw.data_criacao ? String(raw.data_criacao) : undefined,
    }));
  },

  markNotificationRead: async (id: string | number) => {
    await api.post(`/notificacoes/${id}/lida/`);
  },

  markAllNotificationsRead: async () => {
    await api.post('/notificacoes/marcar_todas_lidas/');
  },

  getAchievements: async (): Promise<Achievement[]> => {
    const response = await api.get('/gamificacao/minhas-conquistas/');
    return asArray<Record<string, unknown>>(response.data?.conquistas || []).map((raw) => ({
      id: raw.id as string | number,
      name: String(raw.nome || 'Conquista'),
      description: String(raw.descricao || ''),
      category: raw.categoria ? String(raw.categoria) : undefined,
      points: Number(raw.pontos_recompensa || 0),
      unlocked: Boolean(raw.desbloqueada || raw.data_desbloqueio),
    }));
  },

  getRanking: async (): Promise<RankingEntry[]> => {
    const response = await api.get('/gamificacao/ranking/');
    return asArray<Record<string, unknown>>(response.data?.ranking || []).map((raw, index) => ({
      position: Number(raw.posicao || index + 1),
      username: String(raw.username || raw.usuario_nome || 'Leitor'),
      xp: Number(raw.pontos_xp || raw.xp || 0),
      level: Number(raw.nivel || 1),
      isCurrentUser: Boolean(raw.sou_eu),
    }));
  },

  requestPasswordReset: async (email: string): Promise<string> => {
    const response = await api.post('/auth/recuperar-senha/', { email });
    return response.data?.detail || 'Se houver uma conta para este email, as instrucoes serao enviadas.';
  },
};
