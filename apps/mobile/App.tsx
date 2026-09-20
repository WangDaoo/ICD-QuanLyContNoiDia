import {
  NavigationContainer,
} from '@react-navigation/native';

import {
  SafeAreaProvider,
} from 'react-native-safe-area-context';

import {
  StatusBar,
} from 'expo-status-bar';

import { AuthProvider } from './src/features/auth/context/AuthProvider';
import { RootNavigator } from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="auto" />

          <RootNavigator />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
