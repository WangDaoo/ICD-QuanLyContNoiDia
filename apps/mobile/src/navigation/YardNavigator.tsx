import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ContainerSearchScreen } from '../features/containers/screens/ContainerSearchScreen';
import { ContainerDetailScreen } from '../features/containers/screens/ContainerDetailScreen';
import { YardAssignmentScreen } from '../features/yard/screens/YardAssignmentScreen';
import { YardOperationDetailScreen } from '../features/yard/screens/YardOperationDetailScreen';

import type { YardStackParamList } from './types';

const Stack = createNativeStackNavigator<YardStackParamList>();

export function YardNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ContainerSearch" component={ContainerSearchScreen} />
      <Stack.Screen name="ContainerDetail" component={ContainerDetailScreen} />
      <Stack.Screen name="YardAssignment" component={YardAssignmentScreen} />
      <Stack.Screen name="YardOperationDetail" component={YardOperationDetailScreen} />
    </Stack.Navigator>
  );
}
