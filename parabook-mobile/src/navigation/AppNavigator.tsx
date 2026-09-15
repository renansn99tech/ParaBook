import React from 'react';
<<<<<<< HEAD
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, TouchableOpacity } from 'react-native';
=======
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9
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
<<<<<<< HEAD
  const { status, isAuthenticated, logout, retrySession, sessionError } = useAuth();
=======
  const { status, isAuthenticated, user, logout, retrySession, sessionError } = useAuth();
  const suspenso = Boolean(user?.suspensao?.ativa);
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9

  if (status === 'loading') {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
<<<<<<< HEAD
        <Text style={styles.loadingText}>Carregando sua sessao...</Text>
=======
        <Text style={styles.loadingText}>Carregando sua sessão...</Text>
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9
      </SafeAreaView>
    );
  }

  if (status === 'error') {
    return (
      <SafeAreaView style={styles.loadingContainer}>
<<<<<<< HEAD
        <Text style={styles.errorTitle}>Sessao indisponivel</Text>
=======
        <Text style={styles.errorTitle}>Sessão indisponível</Text>
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9
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
<<<<<<< HEAD
          <Stack.Screen name="Reader" component={ReaderScreen} />
          <Stack.Screen name="MyLibrary" component={MyLibraryScreen} />
=======
          {!suspenso && <Stack.Screen name="Reader" component={ReaderScreen} />}
          {!suspenso && <Stack.Screen name="MyLibrary" component={MyLibraryScreen} />}
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9
          <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} />
          <Stack.Screen name="PostDetail" component={PostDetailScreen} />
          <Stack.Screen name="Authors" component={AuthorsScreen} />
          <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
<<<<<<< HEAD
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Achievements" component={AchievementsScreen} />
          <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen} />
=======
          {!suspenso && <Stack.Screen name="Notifications" component={NotificationsScreen} />}
          {!suspenso && <Stack.Screen name="Achievements" component={AchievementsScreen} />}
          {!suspenso && <Stack.Screen name="CreateCommunity" component={CreateCommunityScreen} />}
>>>>>>> b6f7563b7b17faff77d44e591a401723015a5fe9
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
