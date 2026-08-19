export type RootStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  BookDetail: { bookId: string; title?: string };
  Reader: { bookId: string; title?: string };
  MyLibrary: undefined;
};
