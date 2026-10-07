import type { NavigatorScreenParams } from '@react-navigation/native';
import type { MainTabParamList, WorkQueueTask } from '../../navigation/types';
import type { AuthUser } from '../auth/auth.types';
import { canAccessMobileScreen, hasAnyPermission } from '../auth/permissions';
export function getWorkQueueDestination(
  user: AuthUser | null,
  task: WorkQueueTask,
): NavigatorScreenParams<MainTabParamList> | null {
  if (task.type === 'GATE_IN' && task.visitId && canAccessMobileScreen(user, 'gate.in'))
    return {
      screen: 'GateTab',
      params: { screen: 'GateInForm', params: { visitId: task.visitId } },
    };
  if (task.type === 'GATE_OUT' && canAccessMobileScreen(user, 'gate.out'))
    return { screen: 'GateTab', params: { screen: 'GatePassScan' } };
  if (task.type === 'YARD_ASSIGN' && task.visitId && canAccessMobileScreen(user, 'yard.assign'))
    return {
      screen: 'YardTab',
      params: {
        screen: 'YardAssignment',
        params: { visitId: task.visitId, containerNo: task.containerNo },
      },
    };
  if (task.type === 'YARD_OPERATIONS' && task.operationType && task.entityId) {
    const permission = {
      MOVEMENT: 'yard.move',
      INSPECTION: 'yard.inspect',
      BOOKING: 'yard.booking',
    }[task.operationType];
    if (hasAnyPermission(user, [permission, 'yard.read']))
      return {
        screen: 'YardTab',
        params: {
          screen: 'YardOperationDetail',
          params: {
            operationId: task.entityId,
            operationType: task.operationType,
            visitId: task.visitId,
          },
        },
      };
  }
  if (task.visitId && canAccessMobileScreen(user, 'container.read'))
    return {
      screen: 'LookupTab',
      params: {
        screen: 'ContainerDetail',
        params: { visitId: task.visitId, containerNo: task.containerNo },
      },
    };
  return null;
}
