import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';

import { WelcomeScreen } from '../screens/WelcomeScreen';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { BookDetailScreen } from '../screens/BookDetailScreen';
import { MyLibraryScreen } from '../screens/MyLibraryScreen';
import { ReaderScreen } from '../screens/ReaderScreen';
import { CommunityDetailScreen } from '../screens/CommunityDetailScreen';
import { PostDetailScreen } from '../screens/PostDetailScreen';
import { AuthorsScreen } from '../screens/AuthorsScreen';
import { PublicProfileScreen } from '../screens/PublicProfileScreen';
import { NotificationsScreen } from '../screens/NotificationsScreen';
import { AchievementsScreen } from '../screens/AchievementsScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { CreateCommunityScreen } from '../screens/CreateCommunityScreen';
import { TabNavigator } from './TabNavigator';
import { useAuth } from '../context/AuthContext';
import { colors } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const { status, isAuthenticated, logout, retrySession, sessionError } = useAuth();

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando sua sessão...</Text>
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <Text style={styles.errorTitle}>Sessão indisponível</Text>
        <Text style={styles.loadingText}>{sessionError}</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => void retrySession()}>
          <Text style={styles.primaryButtonText}>Tentar novamente</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => void logout()}>
          <Text style={styles.secondaryButtonText}>Ir para o login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <Stack.Navigator
      key={isAuthenticated ? 'authenticated' : 'guest'}
      initialRouteName={isAuthenticated ? 'MainTabs' : 'Welcome'}
      screenOptions={{
        headerShown: false,
      }}
    >
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={TabNavigator} />
          <Stack.Screen name="BookDetail" component={BookDetailScreen} />
          <Stack.Screen name="Reader" component={ReaderScreen} />
          <Stack.Screen name="MyLibrary" component={MyLibraryScreen} />
          <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          <Stack.Screen name="Authors" component={AuthorsScreen} />
          <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Welcome" component={WelcomeScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 14,
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 28,
  },
  errorTitle: { color: colors.textPrimary, fontSize: 22, fontWeight: '700' },
  primaryButton: { minHeight: 46, marginTop: 20, paddingHorizontal: 18, borderRadius: 23, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.textPrimary, fontWeight: '700' },
  secondaryButton: { minHeight: 44, marginTop: 8, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.textSecondary, fontWeight: '700' },
});
