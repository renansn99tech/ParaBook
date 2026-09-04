import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  BookDetail: { bookId: string; title?: string };
  Reader: { bookId: string; title?: string };
  MyLibrary: { initialStatus?: 'quero_ler' | 'lendo' | 'lido'; favoritesOnly?: boolean; reviewedOnly?: boolean } | undefined;
  CommunityDetail: { communityId: string | number; title?: string };
  PostDetail: { postId: string | number; communityName?: string };
  Authors: undefined;
  PublicProfile: { username: string };
  Notifications: undefined;
  Achievements: undefined;
  CreateCommunity: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Catalogo: undefined;
  Biblioteca: undefined;
  Comunidades: undefined;
  Perfil: undefined;
};
