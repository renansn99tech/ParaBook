import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { CompositeNavigationProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Book } from '../types/book';

// 1. Tipagem das rotas da Stack
export type RootStackParamList = {
  MainTabs: undefined;
  Welcome: undefined;
  BookDetail: {
    bookId: string;
    title?: string;
    book?: Book; // <- Adicionado para resolver o erro no BookDetailScreen
  };
  MyLibrary: undefined;
};

// 2. Tipagem das rotas da Bottom Tabs
export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Communities: undefined;
  Profile: undefined;
};

// 3. Exportações das tipagens de navegação
export type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type ExploreScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Explore'>,
  NativeStackNavigationProp<RootStackParamList>
>;