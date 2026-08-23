import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { AuthTokens } from './authService';

const AUTH_STORAGE_KEY = 'parabook.auth.tokens';

const getWebStorage = () => {
  if (typeof globalThis === 'undefined' || !('localStorage' in globalThis)) {
    return null;
  }

  return globalThis.localStorage;
};

export const authStorage = {
  save: async (tokens: AuthTokens) => {
    const serialized = JSON.stringify(tokens);

    if (Platform.OS === 'web') {
      getWebStorage()?.setItem(AUTH_STORAGE_KEY, serialized);
      return;
    }

    await SecureStore.setItemAsync(AUTH_STORAGE_KEY, serialized);
  },

  read: async (): Promise<AuthTokens | null> => {
    const rawValue = Platform.OS === 'web'
      ? getWebStorage()?.getItem(AUTH_STORAGE_KEY) ?? null
      : await SecureStore.getItemAsync(AUTH_STORAGE_KEY);

    if (!rawValue) return null;

    try {
      const parsed = JSON.parse(rawValue) as AuthTokens;
      return typeof parsed?.access === 'string' && parsed.access.length > 0 ? parsed : null;
    } catch {
      return null;
    }
  },

  clear: async () => {
    if (Platform.OS === 'web') {
      getWebStorage()?.removeItem(AUTH_STORAGE_KEY);
      return;
    }

    await SecureStore.deleteItemAsync(AUTH_STORAGE_KEY);
  },
};
