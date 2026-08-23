import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { authService, AuthTokens, AuthenticatedUser, CurrentUserProfile, extractApiErrorMessage } from '../services/authService';
import { clearAuthTokens, setAuthTokens, setUnauthorizedHandler } from '../services/api';
import { authStorage } from '../services/authStorage';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

type AuthActionResult = {
  success: boolean;
  error?: string;
};

type AuthContextValue = {
  status: AuthStatus;
  isAuthenticated: boolean;
  user: CurrentUserProfile | null;
  authenticatedUser: AuthenticatedUser | null;
  sessionError: string | null;
  login: (username: string, password: string) => Promise<AuthActionResult>;
  register: (payload: {
    username: string;
    email: string;
    password: string;
    termosAceitos: boolean;
  }) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<CurrentUserProfile | null>;
  retrySession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

class SessionBootstrapTimeoutError extends Error {}

const withTimeout = <T,>(promise: Promise<T>, milliseconds: number): Promise<T> => new Promise((resolve, reject) => {
  const timer = setTimeout(() => reject(new SessionBootstrapTimeoutError()), milliseconds);
  promise.then(
    (value) => { clearTimeout(timer); resolve(value); },
    (error) => { clearTimeout(timer); reject(error); },
  );
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUserProfile | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const resetSession = useCallback(async () => {
    authService.logout();
    try {
      await authStorage.clear();
    } catch {
      // O estado em memoria ainda precisa ser encerrado se o armazenamento falhar.
    }
    clearAuthTokens();
    setAuthenticatedUser(null);
    setUser(null);
    setSessionError(null);
    setStatus('unauthenticated');
  }, []);

  const loadCurrentSession = useCallback(async () => {
    const [accountData, profileData] = await Promise.all([
      authService.getAuthenticatedUser(),
      authService.getCurrentUserProfile(),
    ]);

    setAuthenticatedUser(accountData);
    setUser(profileData);
    setSessionError(null);
    setStatus('authenticated');
    return profileData;
  }, []);

  const bootstrapSession = useCallback(async () => {
    setStatus('loading');
    setSessionError(null);

    try {
      const storedTokens = await withTimeout(authStorage.read(), 5000);

      if (!storedTokens?.access) {
        clearAuthTokens();
        setAuthenticatedUser(null);
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      setAuthTokens(storedTokens);
      await withTimeout(loadCurrentSession(), 35000);
    } catch (error) {
      if (error instanceof SessionBootstrapTimeoutError || (axios.isAxiosError(error) && !error.response)) {
        clearAuthTokens();
        setAuthenticatedUser(null);
        setUser(null);
        setSessionError('Nao foi possivel validar sua sessao. Verifique a conexao e tente novamente.');
        setStatus('error');
        return;
      }

      await resetSession();
    }
  }, [loadCurrentSession, resetSession]);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void resetSession();
    });

    void bootstrapSession();

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [bootstrapSession, resetSession]);

  const login = useCallback(async (username: string, password: string): Promise<AuthActionResult> => {
    try {
      const tokens = await authService.login(username, password);
      await authStorage.save(tokens);
      await loadCurrentSession();
      return { success: true };
    } catch (error) {
      await resetSession();
      return {
        success: false,
        error: extractApiErrorMessage(error, 'Nao foi possivel entrar. Confira suas credenciais.'),
      };
    }
  }, [loadCurrentSession, resetSession]);

  const register = useCallback(async (payload: {
    username: string;
    email: string;
    password: string;
    termosAceitos: boolean;
  }): Promise<AuthActionResult> => {
    try {
      const tokens = await authService.register(
        payload.username,
        payload.email,
        payload.password,
        payload.termosAceitos
      );
      await authStorage.save(tokens);
      await loadCurrentSession();
      return { success: true };
    } catch (error) {
      await resetSession();
      return {
        success: false,
        error: extractApiErrorMessage(error, 'Nao foi possivel concluir o cadastro.'),
      };
    }
  }, [loadCurrentSession, resetSession]);

  const refreshUser = useCallback(async () => {
    try {
      return await loadCurrentSession();
    } catch {
      await resetSession();
      return null;
    }
  }, [loadCurrentSession, resetSession]);

  const logout = useCallback(async () => {
    await resetSession();
  }, [resetSession]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    isAuthenticated: status === 'authenticated',
    user,
    authenticatedUser,
    sessionError,
    login,
    register,
    logout,
    refreshUser,
    retrySession: bootstrapSession,
  }), [authenticatedUser, bootstrapSession, login, logout, refreshUser, register, sessionError, status, user]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }

  return context;
};
