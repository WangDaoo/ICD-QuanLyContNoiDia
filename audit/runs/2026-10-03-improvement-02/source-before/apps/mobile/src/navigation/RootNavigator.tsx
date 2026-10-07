import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../features/auth/hooks/useAuth';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { ErrorState } from '../components/ErrorState';
import { useTheme } from '../theme/ThemeProvider';

import { MainTabNavigator } from './MainTabNavigator';
import { NotificationsScreen } from '../features/notifications/screens/NotificationsScreen';
import { MoreScreen } from '../features/more/screens/MoreScreen';

import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { status, restoreError, retryRestore } = useAuth();
  const { theme } = useTheme();

  if (status === 'loading') {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (status === 'restore-error') {
    return (
      <View style={[styles.loading, { backgroundColor: theme.colors.background }]}>
        <ErrorState
          title="Chưa thể khôi phục phiên đăng nhập"
          message={restoreError ?? undefined}
          onRetry={retryRestore}
        />
      </View>
    );
  }

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      {status === 'authenticated' ? (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="Notifications" component={NotificationsScreen} />
          <Stack.Screen name="Account" component={MoreScreen} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} />
      )}
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
