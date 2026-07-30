import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types'; // Certifique-se de que o caminho do types.ts está correto
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { BookDetailScreen } from '../screens/BookDetailScreen';
import { MyLibraryScreen } from '../screens/MyLibraryScreen';
import { TabRoutes } from './TabRoutes';

// A MUDANÇA PRINCIPAL ESTÁ AQUI: adicionar <RootStackParamList> no Stack
const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="MainTabs" component={TabRoutes} />
      <Stack.Screen name="BookDetail" component={BookDetailScreen} />
      <Stack.Screen name="MyLibrary" component={MyLibraryScreen} />
    </Stack.Navigator>
  );
};