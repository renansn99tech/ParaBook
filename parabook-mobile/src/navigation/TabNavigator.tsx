import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { ExploreScreen } from '../screens/ExploreScreen';
import { LibraryTabScreen } from '../screens/MyLibraryScreen';
import { CommunitiesScreen } from '../screens/CommunitiesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors } from '../theme/colors';
import { MainTabParamList } from './types';

const Tab = createBottomTabNavigator<MainTabParamList>();

export const TabNavigator = () => {
    return (
        <Tab.Navigator
        screenOptions={({ route }) => ({
            headerShown: false,
            tabBarShowLabel: true,
            tabBarStyle: {
            backgroundColor: colors.cardBackground,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 60,
            paddingBottom: 8,
            paddingTop: 8,
            },
            tabBarActiveTintColor: colors.primary,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarIcon: ({ color, size, focused }) => {
            let iconName: keyof typeof Ionicons.glyphMap = 'help-outline';

            if (route.name === 'Home') {
                iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Catalogo') {
                iconName = focused ? 'compass' : 'compass-outline';
            } else if (route.name === 'Biblioteca') {
                iconName = focused ? 'library' : 'library-outline';
            } else if (route.name === 'Comunidades') {
                iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Perfil') {
                iconName = focused ? 'person' : 'person-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
            },
        })}
        >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Catalogo" component={ExploreScreen} options={{ tabBarLabel: 'Catálogo' }} />
        <Tab.Screen name="Biblioteca" component={LibraryTabScreen} />
        <Tab.Screen name="Comunidades" component={CommunitiesScreen} />
        <Tab.Screen name="Perfil" component={ProfileScreen} />
        </Tab.Navigator>
    );
};
