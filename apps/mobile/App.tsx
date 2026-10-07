import { NavigationContainer, DarkTheme, DefaultTheme, createNavigationContainerRef } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from './src/features/auth/context/AuthProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { ApiConnectionProvider } from './src/services/api/ApiConnectionProvider';
import { useGuardedDeepLinks } from './src/navigation/useGuardedDeepLinks';
import type { RootStackParamList } from './src/navigation/types';
const navigationRef = createNavigationContainerRef<RootStackParamList>();

function TerminalApp() {
  const { theme, mode } = useTheme();
  const onReady = useGuardedDeepLinks(navigationRef);
  const navigationTheme = mode === 'DARK' ? DarkTheme : DefaultTheme;
  return <NavigationContainer ref={navigationRef} onReady={onReady} theme={{ ...navigationTheme, colors: { ...navigationTheme.colors,
    background: theme.colors.background, card: theme.colors.chrome, text: theme.colors.textPrimary,
    border: theme.colors.border, primary: theme.colors.primary } }}>
    <StatusBar style={mode === 'DARK' ? 'light' : 'dark'} />
    <RootNavigator />
  </NavigationContainer>;
}
export default function App() {
  return <SafeAreaProvider><ThemeProvider><ApiConnectionProvider><AuthProvider><TerminalApp /></AuthProvider></ApiConnectionProvider></ThemeProvider></SafeAreaProvider>;
}
