import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { authService, AuthenticatedUser, CurrentUserProfile, RegisterPayload, extractApiErrorMessage } from '../services/authService';
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
  register: (payload: RegisterPayload) => Promise<AuthActionResult>;
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

const isRecoverableConnectionError = (error: unknown) => (
  error instanceof SessionBootstrapTimeoutError
  || (axios.isAxiosError(error) && (
    !error.response
    || error.code === 'ECONNABORTED'
    || error.code === 'ETIMEDOUT'
  ))
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUserProfile | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const sessionOperationRef = useRef(0);

  const resetSession = useCallback(async () => {
    sessionOperationRef.current += 1;
    authService.logout();
    clearAuthTokens();
    setAuthenticatedUser(null);
    setUser(null);
    setSessionError(null);
    setStatus('unauthenticated');

    try {
      await withTimeout(authStorage.clear(), 3000);
    } catch {
      // A interface ja saiu do loading; uma falha do armazenamento nao pode
      // manter o usuario preso na inicializacao.
    }
  }, []);

  const fetchCurrentSession = useCallback(async () => Promise.all([
      authService.getAuthenticatedUser(),
      authService.getCurrentUserProfile(),
    ]), []);

  const applyCurrentSession = useCallback(([
    accountData,
    profileData,
  ]: [AuthenticatedUser, CurrentUserProfile]) => {
    setAuthenticatedUser(accountData);
    setUser(profileData);
    setSessionError(null);
    setStatus('authenticated');
    return profileData;
  }, []);

  const bootstrapSession = useCallback(async () => {
    const operation = ++sessionOperationRef.current;
    setStatus('loading');
    setSessionError(null);

    try {
      const storedTokens = await withTimeout(authStorage.read(), 5000);
      if (operation !== sessionOperationRef.current) return;

      if (!storedTokens?.access) {
        clearAuthTokens();
        setAuthenticatedUser(null);
        setUser(null);
        setStatus('unauthenticated');
        return;
      }

      setAuthTokens(storedTokens);
      const sessionData = await withTimeout(fetchCurrentSession(), 35000);
      if (operation !== sessionOperationRef.current) return;
      applyCurrentSession(sessionData);
    } catch (error) {
      if (operation !== sessionOperationRef.current) return;

      if (isRecoverableConnectionError(error)) {
        clearAuthTokens();
        setAuthenticatedUser(null);
        setUser(null);
        setSessionError('Nao foi possivel validar sua sessao. Verifique a conexao e tente novamente.');
        setStatus('error');
        return;
      }

      await resetSession();
    }
  }, [applyCurrentSession, fetchCurrentSession, resetSession]);

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
    const operation = ++sessionOperationRef.current;
    try {
      const tokens = await authService.login(username, password);
      await withTimeout(authStorage.save(tokens), 5000);
      const sessionData = await withTimeout(fetchCurrentSession(), 35000);
      if (operation !== sessionOperationRef.current) {
        return { success: false, error: 'A tentativa de login foi cancelada.' };
      }
      applyCurrentSession(sessionData);
      return { success: true };
    } catch (error) {
      await resetSession();
      return {
        success: false,
        error: extractApiErrorMessage(error, 'Nao foi possivel entrar. Confira suas credenciais.'),
      };
    }
  }, [applyCurrentSession, fetchCurrentSession, resetSession]);

  const register = useCallback(async (payload: RegisterPayload): Promise<AuthActionResult> => {
    const operation = ++sessionOperationRef.current;
    try {
      const tokens = await authService.register(payload);
      await withTimeout(authStorage.save(tokens), 5000);
      const sessionData = await withTimeout(fetchCurrentSession(), 35000);
      if (operation !== sessionOperationRef.current) {
        return { success: false, error: 'A tentativa de cadastro foi cancelada.' };
      }
      applyCurrentSession(sessionData);
      return { success: true };
    } catch (error) {
      await resetSession();
      return {
        success: false,
        error: extractApiErrorMessage(error, 'Nao foi possivel concluir o cadastro.'),
      };
    }
  }, [applyCurrentSession, fetchCurrentSession, resetSession]);

  const refreshUser = useCallback(async () => {
    try {
      const sessionData = await withTimeout(fetchCurrentSession(), 35000);
      return applyCurrentSession(sessionData);
    } catch {
      return null;
    }
  }, [applyCurrentSession, fetchCurrentSession]);

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
