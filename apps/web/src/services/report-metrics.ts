import type { ContainerVisit } from '../types';
export function getReportMetrics(
  visits: Pick<ContainerVisit, 'containerType' | 'shippingLine' | 'state' | 'gateInAt'>[],
  now = Date.now(),
) {
  let totalTeu = 0;
  const lineStats: Record<string, number> = {};
  const dwellBuckets = [
    { label: 'Lưu bãi 0–2 ngày', count: 0, percent: 0 },
    { label: 'Lưu bãi 3–7 ngày', count: 0, percent: 0 },
    { label: 'Lưu bãi từ 8 ngày', count: 0, percent: 0 },
  ];
  for (const visit of visits) {
    const teu = visit.containerType.startsWith('20') ? 1 : 2;
    totalTeu += teu;
    lineStats[visit.shippingLine] = (lineStats[visit.shippingLine] ?? 0) + teu;
    if (!visit.gateInAt || ['EXITED', 'CANCELLED'].includes(visit.state)) continue;
    const days = Math.floor((now - new Date(visit.gateInAt).getTime()) / 86400000);
    if (!Number.isFinite(days) || days < 0) continue;
    dwellBuckets[days <= 2 ? 0 : days <= 7 ? 1 : 2].count++;
  }
  const activeCount = dwellBuckets.reduce((sum, bucket) => sum + bucket.count, 0);
  for (const bucket of dwellBuckets)
    bucket.percent = activeCount ? Math.round((bucket.count * 100) / activeCount) : 0;
  return { totalTeu, lineStats, dwellBuckets };
}
