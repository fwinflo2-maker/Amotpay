import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, loadToken, saveToken, clearToken, User } from '../api';
import { clearSessionFlags } from './session';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (phone: string, password: string) => Promise<void>;
  register: (data: object) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const u = await api.me();
      setUser(u);
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    (async () => {
      await loadToken();
      await refresh();
      setLoading(false);
    })();
  }, []);

  const login = async (phone: string, password: string) => {
    const res = await api.login(phone, password);
    await saveToken(res.token);
    setUser(res.user);
  };

  const register = async (data: object) => {
    const res = await api.register(data);
    await saveToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Local logout must still complete if the session is already invalid or the network is down.
    } finally {
      await clearToken();
      await clearSessionFlags();
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
