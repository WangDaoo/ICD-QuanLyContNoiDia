import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { GateInScanScreen } from '../features/gate-in/screens/GateInScanScreen';
import { GateInFormScreen } from '../features/gate-in/screens/GateInFormScreen';
import { GateInSuccessScreen } from '../features/gate-in/screens/GateInSuccessScreen';
import { GatePassScanScreen } from '../features/gate-out/screens/GatePassScanScreen';
import { GateOutConfirmScreen } from '../features/gate-out/screens/GateOutConfirmScreen';

import type { GateStackParamList } from './types';

const Stack = createNativeStackNavigator<GateStackParamList>();

export function GateNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GateInScan" component={GateInScanScreen} />
      <Stack.Screen name="GateInForm" component={GateInFormScreen} />
      <Stack.Screen name="GateInSuccess" component={GateInSuccessScreen} />
      <Stack.Screen name="GatePassScan" component={GatePassScanScreen} />
      <Stack.Screen name="GateOutConfirm" component={GateOutConfirmScreen} />
    </Stack.Navigator>
  );
}
