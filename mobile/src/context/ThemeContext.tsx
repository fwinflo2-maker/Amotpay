import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme as useSystemScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { buildTheme, type ColorScheme, type Theme } from '../theme/designTokens';

export type AppearanceMode = 'system' | ColorScheme;

type ThemeContextValue = {
  theme: Theme;
  mode: AppearanceMode;
  setMode: (mode: AppearanceMode) => Promise<void>;
};

const STORAGE_KEY = 'amotpay_appearance';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useSystemScheme();
  const [mode, setModeState] = useState<AppearanceMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await SecureStore.getItemAsync(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
      setReady(true);
    })();
  }, []);

  const scheme: ColorScheme =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  const theme = useMemo(() => buildTheme(scheme), [scheme]);

  const setMode = async (next: AppearanceMode) => {
    setModeState(next);
    await SecureStore.setItemAsync(STORAGE_KEY, next);
  };

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ theme, mode, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
