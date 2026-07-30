import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { BookDetailScreen } from '../screens/BookDetailScreen';
import { MyLibraryScreen } from '../screens/MyLibraryScreen';
import { TabNavigator } from './TabNavigator';
import { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
    return (
        <Stack.Navigator
        screenOptions={{
            headerShown: false,
        }}
        >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen name="BookDetail" component={BookDetailScreen} />
        <Stack.Screen name="MyLibrary" component={MyLibraryScreen} />
        </Stack.Navigator>
    );
};