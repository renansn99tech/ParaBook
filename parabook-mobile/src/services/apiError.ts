import axios from 'axios';

export type ApiErrorKind = 'offline' | 'unauthorized' | 'error';

export type ApiErrorPresentation = {
  kind: ApiErrorKind;
  title: string;
  message: string;
  icon: 'cloud-offline-outline' | 'lock-closed-outline' | 'alert-circle-outline';
};

export const describeApiError = (error: unknown): ApiErrorPresentation => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status === 401 || status === 403) {
      return {
        kind: 'unauthorized',
        title: 'Acesso ao catálogo expirou',
        message: 'Entre novamente para continuar acessando o acervo.',
        icon: 'lock-closed-outline',
      };
    }

    if (!error.response) {
      return {
        kind: 'offline',
        title: 'Sem conexão com o catálogo',
        message: 'Verifique sua internet e se o servidor do ParaBook está acessível.',
        icon: 'cloud-offline-outline',
      };
    }
  }

  return {
    kind: 'error',
    title: 'Catálogo indisponível',
    message: 'O serviço não conseguiu carregar o acervo. Tente novamente em instantes.',
    icon: 'alert-circle-outline',
  };
};
