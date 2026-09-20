import {
  ActivityIndicator,
  StyleSheet,
  View,
} from 'react-native';

import {
  createNativeStackNavigator,
} from '@react-navigation/native-stack';

import { useAuth } from '../features/auth/hooks/useAuth';
import { LoginScreen } from '../features/auth/screens/LoginScreen';

import { MainTabNavigator } from './MainTabNavigator';

import type {
  RootStackParamList,
} from './types';

const Stack =
  createNativeStackNavigator<
    RootStackParamList
  >();

export function RootNavigator() {
  const { status } = useAuth();

  if (status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator
          size="large"
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
      {status ===
      'authenticated' ? (
        <Stack.Screen
          name="Main"
          component={
            MainTabNavigator
          }
        />
      ) : (
        <Stack.Screen
          name="Login"
          component={
            LoginScreen
          }
        />
      )}
    </Stack.Navigator>
  );
}

const styles =
  StyleSheet.create({
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
