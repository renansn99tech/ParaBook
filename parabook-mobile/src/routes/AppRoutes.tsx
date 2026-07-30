import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { TabRoutes } from './TabRoutes';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppRoutes = () => {
  return (
    <Stack.Navigator
      initialRouteName="Welcome"
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Home" component={TabRoutes} />
    </Stack.Navigator>
  );
};