import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import { authService, AuthenticatedUser, CurrentUserProfile, RegisterPayload, extractApiErrorMessage } from '../services/authService';
import { clearAuthTokens, setAuthTokens, setUnauthorizedHandler, setAgeRestrictionHandler } from '../services/api';
import { AppState } from 'react-native';
import { authStorage } from '../services/authStorage';
import { ageService, AgeEligibility } from '../services/ageService';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

type AuthActionResult = {
  success: boolean;
  error?: string;
  requiresTwoFactor?: boolean;
};

type AuthContextValue = {
  status: AuthStatus;
  isAuthenticated: boolean;
  user: CurrentUserProfile | null;
  authenticatedUser: AuthenticatedUser | null;
  sessionError: string | null;
  eligibility: AgeEligibility | null;
  login: (username: string, password: string, twoFactorCode?: string) => Promise<AuthActionResult>;
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
    || error.response.status >= 500
    || error.code === 'ECONNABORTED'
    || error.code === 'ETIMEDOUT'
  ))
);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<CurrentUserProfile | null>(null);
  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<AgeEligibility | null>(null);
  const sessionOperationRef = useRef(0);

  const resetSession = useCallback(async () => {
    sessionOperationRef.current += 1;
    clearAuthTokens();
    setAuthenticatedUser(null);
    setUser(null);
    setEligibility(null);
    setSessionError(null);
    setStatus('unauthenticated');

    try {
      await withTimeout(authStorage.clear(), 3000);
    } catch {
      // A interface ja saiu do loading; uma falha do armazenamento nao pode
      // manter o usuario preso na inicializacao.
    }
  }, []);

  const fetchCurrentSession = useCallback(async (): Promise<[AuthenticatedUser, CurrentUserProfile | null, AgeEligibility]> => {
    const [account, age] = await Promise.all([authService.getAuthenticatedUser(), ageService.get()]);
    if (age.restricao_ativa) return [account, null, age];
    try {
      return [account, await authService.getCurrentUserProfile(), age];
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data?.codigo === 'conta_restrita_etaria') {
        return [account, null, await ageService.get()];
      }
      throw error;
    }
  }, []);

  const applyCurrentSession = useCallback(([
    accountData,
    profileData,
    ageData,
  ]: [AuthenticatedUser, CurrentUserProfile | null, AgeEligibility]) => {
    setAuthenticatedUser(accountData);
    setUser(profileData);
    setEligibility(ageData);
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
      const sessionData = await withTimeout(fetchCurrentSession(), 125000);
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

  const login = useCallback(async (username: string, password: string, twoFactorCode?: string): Promise<AuthActionResult> => {
    const operation = ++sessionOperationRef.current;
    try {
      const response = await authService.login(username, password, twoFactorCode);
      if (response.requiresTwoFactor) {
        return { success: false, requiresTwoFactor: true, error: response.detail };
      }
      await withTimeout(authStorage.save(response.tokens), 5000);
      const sessionData = await withTimeout(fetchCurrentSession(), 125000);
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
      const sessionData = await withTimeout(fetchCurrentSession(), 125000);
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
    const operation = sessionOperationRef.current;
    try {
      const sessionData = await withTimeout(fetchCurrentSession(), 125000);
      if (operation !== sessionOperationRef.current) return null;
      return applyCurrentSession(sessionData);
    } catch {
      return null;
    }
  }, [applyCurrentSession, fetchCurrentSession]);

  const logout = useCallback(async () => {
    try {
      await withTimeout(authService.logout(), 5000);
    } catch {
      // O logout local deve concluir mesmo se o servidor estiver indisponivel.
    } finally {
      await resetSession();
    }
  }, [resetSession]);

  useEffect(() => {
    setAgeRestrictionHandler(() => { void refreshUser(); });
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active' && status === 'authenticated') void refreshUser();
    });
    return () => { setAgeRestrictionHandler(null); subscription.remove(); };
  }, [refreshUser, status]);

  useEffect(() => {
    if (status !== 'authenticated' || !eligibility?.politica_ativa
        || eligibility.estado !== 'pendente' || eligibility.restricao_ativa
        || !eligibility.prazo_declaracao_em) return;
    const delay = Math.max(30000, new Date(eligibility.prazo_declaracao_em).getTime() - Date.now());
    if (!Number.isFinite(delay)) return;
    // Pede a decisão atual ao servidor; não calcula elegibilidade no cliente.
    const timer = setTimeout(() => { void refreshUser(); }, delay);
    return () => clearTimeout(timer);
  }, [eligibility, refreshUser, status]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    isAuthenticated: status === 'authenticated',
    user,
    authenticatedUser,
    sessionError,
    eligibility,
    login,
    register,
    logout,
    refreshUser,
    retrySession: bootstrapSession,
  }), [authenticatedUser, bootstrapSession, eligibility, login, logout, refreshUser, register, sessionError, status, user]);

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
