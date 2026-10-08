import { api } from './api';

export interface AgeEligibility {
  estado: 'pendente' | 'restrito_menor' | 'liberado_adulto' | 'em_revisao';
  declaracoes_sucesso: number;
  prazo_declaracao_em: string | null;
  proxima_correcao_permitida_em: string | null;
  restricao_ativa: boolean;
  politica_ativa: boolean;
  chave_declaracao: string;
  versao_politica: string;
}

export const ageService = {
  reviews: async (): Promise<AgeReview[]> => (await api.get('/auth/idade/revisao/')).data,
  requestReview: async (message: string, attemptKey: string): Promise<AgeReview> => (
    await api.post('/auth/idade/revisao/', { mensagem: message, chave_idempotencia: attemptKey })
  ).data,
  get: async (): Promise<AgeEligibility> => (await api.get('/auth/idade/')).data,
  declare: async (birthDate: string, attemptKey: string): Promise<AgeEligibility> => (
    await api.put('/auth/idade/', { data_nascimento: birthDate, chave_idempotencia: attemptKey })
  ).data,
};

export interface AgeReview {
  id: number;
  protocolo: string;
  status: 'aberta' | 'em_analise' | 'respondida' | 'encerrada';
  resposta: string;
  decisao: string;
  criada_em: string;
  atualizada_em: string;
  encerrada_em: string | null;
}
