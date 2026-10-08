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
    if (status === 401) {
      return {
        kind: 'unauthorized',
        title: 'Acesso ao catálogo expirou',
        message: 'Entre novamente para continuar acessando o acervo.',
        icon: 'lock-closed-outline',
      };
    }

    if (status === 403 || status === 404) {
      return {
        kind: 'unauthorized', title: 'Conteúdo indisponível para sua conta',
        message: 'Confira as condições de acesso ou volte ao catálogo. Entrar novamente não altera essa permissão.',
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
