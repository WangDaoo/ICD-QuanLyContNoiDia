import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { ContainerSearchScreen } from '../features/containers/screens/ContainerSearchScreen';
import { ContainerDetailScreen } from '../features/containers/screens/ContainerDetailScreen';
import { YardAssignmentScreen } from '../features/yard/screens/YardAssignmentScreen';
import { YardOperationDetailScreen } from '../features/yard/screens/YardOperationDetailScreen';
import { YardOperationsScreen } from '../features/yard/screens/YardOperationsScreen';
import { YardHomeScreen } from '../features/yard/screens/YardHomeScreen';
import { SurveyHomeScreen } from '../features/yard/screens/SurveyHomeScreen';
import { ForbiddenScreen } from '../components/ForbiddenScreen';
import { useAuth } from '../features/auth/hooks/useAuth';
import { canAccessMobileScreen } from '../features/auth/permissions';

import type { YardStackParamList } from './types';

const Stack = createNativeStackNavigator<YardStackParamList>();

function TerminalYardStack({ initialRoute }: { initialRoute: 'YardHome' | 'ContainerSearch' | 'SurveyHome' }) {
  const { user } = useAuth();
  const canReadContainers = canAccessMobileScreen(user, 'container.read');
  const canAssignYard = canAccessMobileScreen(user, 'yard.assign');
  const canOperateYard = canAccessMobileScreen(user, 'yard.operations');

  if (!canReadContainers && !canAssignYard && !canOperateYard && !canAccessMobileScreen(user, 'yard.read')) {
    return <ForbiddenScreen message="Tài khoản hiện tại không có quyền xem hoặc tác nghiệp bãi." />;
  }

  return (
    <Stack.Navigator
      initialRouteName={initialRoute}
      screenOptions={{ headerShown: false }}
    >
      {canAccessMobileScreen(user, 'yard.read') || canAssignYard || canOperateYard ? <Stack.Screen name="YardHome" component={YardHomeScreen} /> : null}
      {canAccessMobileScreen(user, 'yard.inspect') ? <Stack.Screen name="SurveyHome" component={SurveyHomeScreen} /> : null}
      {canReadContainers ? (
        <>
          <Stack.Screen name="ContainerSearch" component={ContainerSearchScreen} />
          <Stack.Screen name="ContainerDetail" component={ContainerDetailScreen} />
        </>
      ) : null}
      {canAssignYard ? (
        <Stack.Screen name="YardAssignment" component={YardAssignmentScreen} />
      ) : null}
      {canOperateYard || canAccessMobileScreen(user, 'yard.read') ? <>
        <Stack.Screen name="YardOperations" component={YardOperationsScreen} />
        <Stack.Screen name="YardOperationDetail" component={YardOperationDetailScreen} />
      </> : null}
    </Stack.Navigator>
  );
}

export const YardNavigator = () => <TerminalYardStack initialRoute="YardHome" />;
export const LookupNavigator = () => <TerminalYardStack initialRoute="ContainerSearch" />;
export const SurveyNavigator = () => <TerminalYardStack initialRoute="SurveyHome" />;
