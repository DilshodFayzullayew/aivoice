import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError, AuthUser, fetchMe, loginRequest, logoutRequest, setAuthToken, setUnauthorizedHandler } from './api/voiceApi';
import { setHistoryUser } from './storage/voiceHistory';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  /** true — hozirgina login va parol bilan kirildi (saqlangan sessiyadan emas) */
  freshLogin: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [freshLogin, setFreshLogin] = useState(false);

  const applySession = useCallback((token: string | null, nextUser: AuthUser | null) => {
    setAuthToken(token);
    setHistoryUser(nextUser?.id ?? null);
    setUser(nextUser);
    setStatus(token && nextUser ? 'signedIn' : 'signedOut');
  }, []);

  const clearSession = useCallback(async () => {
    applySession(null, null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]).catch(() => {});
  }, [applySession]);

  // Ilova ochilganda saqlangan sessiyani tiklash
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
    });

    (async () => {
      let token: string | null = null;
      let cached: AuthUser | null = null;
      try {
        token = await AsyncStorage.getItem(TOKEN_KEY);
        const raw = await AsyncStorage.getItem(USER_KEY);
        cached = raw ? (JSON.parse(raw) as AuthUser) : null;
      } catch {
        // xotira o'qilmasa — login sahifasi
      }
      if (!token || !cached) {
        applySession(null, null);
        return;
      }
      // Darhol kirgizamiz (server bo'lmasa ham ishlash uchun), keyin ma'lumotni serverdan yangilaymiz
      applySession(token, cached);
      try {
        const fresh = await fetchMe();
        setUser(fresh);
        AsyncStorage.setItem(USER_KEY, JSON.stringify(fresh)).catch(() => {});
      } catch (e) {
        // 401 bo'lsa setUnauthorizedHandler sessiyani o'zi tozalaydi; tarmoq xatosida keshdagi ma'lumot qoladi
        if (e instanceof ApiError && e.status === 401) clearSession();
      }
    })();
  }, [applySession, clearSession]);

  const login = useCallback(
    async (username: string, password: string) => {
      const res = await loginRequest(username, password);
      await AsyncStorage.multiSet([
        [TOKEN_KEY, res.token],
        [USER_KEY, JSON.stringify(res.user)],
      ]);
      setFreshLogin(true);
      applySession(res.token, res.user);
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } catch {
      // server bilan aloqa bo'lmasa ham telefondan chiqamiz
    }
    await clearSession();
  }, [clearSession]);

  const value = useMemo(() => ({ status, user, freshLogin, login, logout }), [status, user, freshLogin, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth AuthProvider ichida ishlatilishi kerak');
  return ctx;
}
