import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, View, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme as baseTheme, type Theme } from './theme';
import { darkColors, lightColors } from './colors';
import { resolveAppearance, type AppearancePreference } from './appearance';

type ThemeState = { theme: Theme; mode: 'LIGHT' | 'DARK'; preference: AppearancePreference; appearanceError: string; toggleTheme: () => void; useSystemTheme: () => void };
const ThemeContext = createContext<ThemeState>({ theme: baseTheme, mode: 'LIGHT', preference: 'SYSTEM', appearanceError: '', toggleTheme: () => {}, useSystemTheme: () => {} });
const APPEARANCE_KEY = 'icd.mobile.appearance.v1';

export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const [preference, setPreference] = useState<AppearancePreference>('SYSTEM');
  const [ready, setReady] = useState(false);
  const [appearanceError, setAppearanceError] = useState('');
  const writes = useRef(Promise.resolve());
  useEffect(() => {
    let current = true;
    AsyncStorage.getItem(APPEARANCE_KEY).then(saved => {
      if (current && (saved === 'LIGHT' || saved === 'DARK' || saved === 'SYSTEM')) setPreference(saved);
    }).catch(() => { if (current) setAppearanceError('Không đọc được tùy chọn giao diện. Đang dùng giao diện hệ thống.'); })
      .finally(() => { if (current) setReady(true); });
    return () => { current = false; };
  }, []);
  const mode = resolveAppearance(preference, system);
  const save = (next: AppearancePreference) => {
    setPreference(next); setAppearanceError('');
    writes.current = writes.current.catch(() => {}).then(() => AsyncStorage.setItem(APPEARANCE_KEY, next))
      .catch(() => setAppearanceError('Không lưu được giao diện. Thử chọn lại giao diện.'));
  };
  const value = useMemo<ThemeState>(() => ({
    mode, preference, appearanceError, theme: { ...baseTheme, colors: mode === 'LIGHT' ? lightColors : darkColors },
    toggleTheme: () => save(mode === 'LIGHT' ? 'DARK' : 'LIGHT'), useSystemTheme: () => save('SYSTEM'),
  }), [mode, preference, appearanceError]);
  if (!ready) return <View style={{ flex: 1, backgroundColor: mode === 'DARK' ? darkColors.background : lightColors.background, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator accessibilityLabel="Đang tải giao diện" /></View>;
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export const useTheme = () => useContext(ThemeContext);
