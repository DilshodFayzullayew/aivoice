import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Ilovaning rang palitrasi: tungi (standart) va kunduzgi rejim.
 * Ikkala palitrada kalitlar bir xil — ekranlar faqat T.<kalit> orqali rang oladi.
 */
export const DARK = {
  bg: '#0a0f1a',
  surface: '#111827',
  surface2: '#162033',
  border: '#1f2a3d',
  borderStrong: '#2b3a55',
  inverse: '#1e293b',
  tabBar: 'rgba(17, 24, 39, 0.96)',

  text: '#e6ebf5',
  text2: '#b4bccd',
  muted: '#8b95a9',
  faint: '#5b667a',

  brand: '#2563eb',
  brandBright: '#3b82f6',
  brandText: '#60a5fa',
  brandLight: '#93c5fd',
  brandSoft: 'rgba(59, 130, 246, 0.14)',

  green: '#34d399',
  greenSoft: 'rgba(16, 185, 129, 0.14)',
  red: '#f87171',
  redSoft: 'rgba(239, 68, 68, 0.14)',
  redBorder: 'rgba(239, 68, 68, 0.3)',
  amber: '#fbbf24',
  amberSoft: 'rgba(245, 158, 11, 0.14)',
  amberBorder: 'rgba(245, 158, 11, 0.3)',
  purple: '#a78bfa',
  purpleSoft: 'rgba(139, 92, 246, 0.16)',
};

export type Palette = typeof DARK;

export const LIGHT: Palette = {
  bg: '#faf8ff',
  surface: '#ffffff',
  surface2: '#f1f3f9',
  border: '#e2e5f1',
  borderStrong: '#c3c5d8',
  inverse: '#131b2e',
  tabBar: 'rgba(255, 255, 255, 0.95)',

  text: '#131b2e',
  text2: '#434655',
  muted: '#737687',
  faint: '#a3a6b4',

  brand: '#0051df',
  brandBright: '#2f6bff',
  brandText: '#0051df',
  brandLight: '#003cac',
  brandSoft: '#eef2ff',

  green: '#006c47',
  greenSoft: '#dcfce7',
  red: '#ba1a1a',
  redSoft: '#ffe9e6',
  redBorder: '#ffdad6',
  amber: '#b45309',
  amberSoft: '#fffbeb',
  amberBorder: '#fde68a',
  purple: '#5d39e0',
  purpleSoft: '#ede9fe',
};

export type ThemeMode = 'dark' | 'light';

interface ThemeValue {
  mode: ThemeMode;
  T: Palette;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const THEME_KEY = 'app_theme';
const ThemeContext = createContext<ThemeValue>({
  mode: 'dark',
  T: DARK,
  isDark: true,
  setMode: () => {},
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((v) => (v === 'light' || v === 'dark') && setModeState(v))
      .catch(() => {});
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(THEME_KEY, m).catch(() => {});
  }, []);

  const value = useMemo<ThemeValue>(
    () => ({
      mode,
      T: mode === 'dark' ? DARK : LIGHT,
      isDark: mode === 'dark',
      setMode,
      toggle: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    }),
    [mode, setMode],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);

/** Ekran uslublarini joriy palitradan yasaydi: const styles = useStyles(makeStyles) */
export function useStyles<S>(factory: (T: Palette) => S): S {
  const { T } = useTheme();
  return useMemo(() => factory(T), [T, factory]);
}
