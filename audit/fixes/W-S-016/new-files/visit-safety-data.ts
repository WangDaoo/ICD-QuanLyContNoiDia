export type SafetyReadStatus = 'ready' | 'unavailable' | 'forbidden';
export type VisitSafetyStatus = Record<string, { holds: SafetyReadStatus; gatePasses: SafetyReadStatus }>;

export function areSafetyReadsReady(visitIds: readonly string[], statuses: VisitSafetyStatus, kind: 'holds' | 'gatePasses'): boolean {
  return visitIds.every(id => statuses[id]?.[kind] === 'ready');
}

export function getSafetyReadStatus(result: PromiseSettledResult<unknown>): SafetyReadStatus {
  if (result.status === 'fulfilled') return 'ready';
  return result.reason?.status === 403 || result.reason?.status === 401 ? 'forbidden' : 'unavailable';
}

export function mergeSafetyRecords<T extends { containerVisitId: string }>(
  next: T[], previous: T[], statuses: VisitSafetyStatus, kind: 'holds' | 'gatePasses',
): T[] {
  // Preserve only transient failures; permission denial must not keep exposing old data.
  return [...next, ...previous.filter(row => statuses[row.containerVisitId]?.[kind] === 'unavailable')];
}
