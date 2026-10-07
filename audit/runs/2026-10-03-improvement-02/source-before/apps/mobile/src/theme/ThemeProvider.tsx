import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';
import { theme as baseTheme, type Theme } from './theme';
import { darkColors, lightColors } from './colors';

type ThemeState = { theme: Theme; mode: 'LIGHT' | 'DARK'; toggleTheme: () => void };
const ThemeContext = createContext<ThemeState>({ theme: baseTheme, mode: 'LIGHT', toggleTheme: () => {} });

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setMode] = useState<'LIGHT' | 'DARK'>('LIGHT');
  const value = useMemo<ThemeState>(() => ({
    mode, theme: { ...baseTheme, colors: mode === 'LIGHT' ? lightColors : darkColors },
    toggleTheme: () => setMode(current => current === 'LIGHT' ? 'DARK' : 'LIGHT'),
  }), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
