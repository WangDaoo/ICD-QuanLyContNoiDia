export type NotificationTarget = { kind: 'container' | 'gate-in' | 'inspection'; id: string };
export function canOpenNotificationTarget(
  target: NotificationTarget,
  permissionCodes: string[],
): boolean {
  const permissions: Record<NotificationTarget['kind'], string[]> = {
    container: ['container.read'],
    'gate-in': ['gate_in.create'],
    inspection: ['yard.read', 'yard.inspect'],
  };
  return (
    permissionCodes.includes('*') ||
    permissions[target.kind].some((permission) => permissionCodes.includes(permission))
  );
}
export function getNotificationTarget(notification: {
  deepLink?: string | null;
}): NotificationTarget | null {
  const link = notification.deepLink ?? '';
  const routes = [
    ['container', /^\/containers\/([A-Za-z0-9-]+)$/],
    ['gate-in', /^\/tasks\/gate-in\/([A-Za-z0-9-]+)$/],
    ['inspection', /^\/inspections\/([A-Za-z0-9-]+)$/],
  ] as const;
  for (const [kind, pattern] of routes) {
    const match = pattern.exec(link);
    if (match) return { kind, id: match[1] };
  }
  return null;
}
