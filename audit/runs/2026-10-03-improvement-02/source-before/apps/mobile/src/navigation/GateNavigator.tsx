import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { GateInScanScreen } from '../features/gate-in/screens/GateInScanScreen';
import { GateInFormScreen } from '../features/gate-in/screens/GateInFormScreen';
import { GateInSuccessScreen } from '../features/gate-in/screens/GateInSuccessScreen';
import { GatePassScanScreen } from '../features/gate-out/screens/GatePassScanScreen';
import { GateOutConfirmScreen } from '../features/gate-out/screens/GateOutConfirmScreen';
import { ForbiddenScreen } from '../components/ForbiddenScreen';
import { useAuth } from '../features/auth/hooks/useAuth';
import { canAccessMobileScreen } from '../features/auth/permissions';

import type { GateStackParamList } from './types';

const Stack = createNativeStackNavigator<GateStackParamList>();

export function GateNavigator() {
  const { user } = useAuth();
  const canGateIn = canAccessMobileScreen(user, 'gate.in');
  const canGateOut = canAccessMobileScreen(user, 'gate.out');

  if (!canGateIn && !canGateOut) {
    return <ForbiddenScreen message="Tài khoản hiện tại không có quyền tác nghiệp cổng." />;
  }

  return (
    <Stack.Navigator
      initialRouteName={canGateIn ? 'GateInScan' : 'GatePassScan'}
      screenOptions={{ headerShown: false }}
    >
      {canGateIn ? (
        <>
          <Stack.Screen name="GateInScan" component={GateInScanScreen} />
          <Stack.Screen name="GateInForm" component={GateInFormScreen} />
          <Stack.Screen name="GateInSuccess" component={GateInSuccessScreen} />
        </>
      ) : null}
      {canGateOut ? (
        <>
          <Stack.Screen name="GatePassScan" component={GatePassScanScreen} />
          <Stack.Screen name="GateOutConfirm" component={GateOutConfirmScreen} />
        </>
      ) : null}
    </Stack.Navigator>
  );
}
