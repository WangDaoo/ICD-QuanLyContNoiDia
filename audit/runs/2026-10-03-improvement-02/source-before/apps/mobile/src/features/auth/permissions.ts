import type { MainTabParamList, WorkQueueTask } from '../../navigation/types';
import type { AuthUser } from './auth.types';

export type MobileTabName = keyof MainTabParamList;

export type MobileScreenPermission =
  | 'gate.in'
  | 'gate.out'
  | 'yard.assign'
  | 'yard.operations'
  | 'yard.read'
  | 'yard.inspect'
  | 'container.read'
  | 'billing.manage'
  | 'handover.manage'
  | 'work_queue.read';

const SCREEN_PERMISSIONS: Record<MobileScreenPermission, string[]> = {
  'gate.in': ['gate_in.create'],
  'gate.out': ['gate_pass.use'],
  'yard.assign': ['yard.update'],
  'yard.operations': ['yard.move', 'yard.inspect', 'yard.booking'],
  'yard.read': ['yard.read'],
  'yard.inspect': ['yard.inspect'],
  'container.read': ['container.read'],
  'billing.manage': ['billing.manage'],
  'handover.manage': ['handover.read'],
  'work_queue.read': [
    'gate_in.create',
    'gate_pass.use',
    'truck_visit.read',
    'yard.read',
    'yard.update',
    'yard.move',
    'yard.inspect',
    'yard.booking',
    'billing.manage',
    'billing.read',
    'handover.read',
  ],
};

const TAB_PERMISSIONS: Record<MobileTabName, MobileScreenPermission[]> = {
  WorkQueueTab: ['work_queue.read'],
  GateTab: ['gate.in', 'gate.out'],
  YardTab: ['yard.read', 'yard.assign', 'yard.operations'],
  LookupTab: ['container.read'],
  SurveyTab: ['yard.inspect'],
  MonitorTab: ['yard.read'],
};

const TASK_PERMISSIONS: Record<WorkQueueTask['type'], MobileScreenPermission[]> = {
  GATE_IN: ['gate.in'],
  GATE_OUT: ['gate.out'],
  YARD_ASSIGN: ['yard.assign'],
  YARD_OPERATIONS: ['yard.operations'],
  BILLING: ['billing.manage'],
  HANDOVER_REVIEW: ['handover.manage'],
};

export function getEffectivePermissionCodes(user: AuthUser | null): string[] {
  if (!user) {
    return [];
  }

  // Backend permissions remain authoritative even when the role label is ADMIN.
  return Array.from(new Set(user.permissionCodes));
}

export function hasAnyPermission(user: AuthUser | null, permissionCodes: string[]): boolean {
  if (permissionCodes.length === 0) {
    return true;
  }

  const effectivePermissions = getEffectivePermissionCodes(user);
  if (effectivePermissions.includes('*')) {
    return true;
  }

  return permissionCodes.some((permissionCode) => effectivePermissions.includes(permissionCode));
}

export function canAccessMobileScreen(
  user: AuthUser | null,
  permission: MobileScreenPermission,
): boolean {
  return hasAnyPermission(user, SCREEN_PERMISSIONS[permission]);
}

export function canAccessMobileTab(user: AuthUser | null, tabName: MobileTabName): boolean {
  return TAB_PERMISSIONS[tabName].some((permission) => canAccessMobileScreen(user, permission))
    || TAB_PERMISSIONS[tabName].length === 0;
}

export function canAccessWorkQueueTask(
  user: AuthUser | null,
  taskType: WorkQueueTask['type'],
): boolean {
  return TASK_PERMISSIONS[taskType].some((permission) => canAccessMobileScreen(user, permission));
}

export function getTerminalTabs(user: AuthUser | null): MobileTabName[] {
  const tabs: MobileTabName[] = user?.roleCodes.includes('OPERATOR')
    ? ['WorkQueueTab', 'LookupTab', 'MonitorTab']
    : ['GateTab', 'YardTab', 'SurveyTab', 'LookupTab', 'WorkQueueTab'];
  return tabs.filter(tab => canAccessMobileTab(user, tab));
}

export function getRegisteredTerminalTabs(user: AuthUser | null): MobileTabName[] {
  const visible = getTerminalTabs(user);
  const operationTabs: MobileTabName[] = ['GateTab', 'YardTab', 'SurveyTab'];
  return [...visible, ...operationTabs.filter(tab => !visible.includes(tab) && canAccessMobileTab(user, tab))];
}
