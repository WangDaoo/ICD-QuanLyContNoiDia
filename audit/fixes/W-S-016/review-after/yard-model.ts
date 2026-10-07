import type { ContainerInspection, ContainerVisit, OperationalHold, YardSlot } from '../../types';

export type YardColorMode = 'SLOT' | 'STATE';
export interface YardLegendEntry {
  key: string;
  label: string;
  background: string;
  color: string;
  border: string;
}
export interface YardSlotAppearance extends YardLegendEntry {
  hold: boolean;
  container?: ContainerVisit;
}

const SLOT_PALETTE = [
  { key: 'empty', label: 'Slot trống', background: '#F8FAFC', color: '#334155', border: '#CBD5E1' },
  { key: 'occupied', label: 'Có container', background: '#2563EB', color: '#FFFFFF', border: '#1D4ED8' },
  { key: 'maintenance', label: 'Bảo trì / Ngưng dùng', background: '#64748B', color: '#FFFFFF', border: '#475569' },
  { key: 'reefer', label: 'Slot lạnh trống (Reefer)', background: '#06B6D4', color: '#083344', border: '#0891B2' },
] as const satisfies readonly YardLegendEntry[];

export const YARD_PALETTE: Record<YardColorMode, readonly YardLegendEntry[]> = {
  SLOT: SLOT_PALETTE,
  STATE: [
    ...SLOT_PALETTE,
    { key: 'in-yard', label: 'Trong bãi', background: '#16A34A', color: '#FFFFFF', border: '#15803D' },
    { key: 'hold', label: 'Đang giữ (Hold)', background: '#DC2626', color: '#FFFFFF', border: '#B91C1C' },
    { key: 'unverified', label: 'Holds chưa kiểm tra', background: '#E2E8F0', color: '#334155', border: '#94A3B8' },
    { key: 'inspection', label: 'Đang kiểm định', background: '#EAB308', color: '#422006', border: '#CA8A04' },
    { key: 'gate-pass', label: 'Đã cấp Phiếu ra cổng', background: '#7C3AED', color: '#FFFFFF', border: '#6D28D9' },
    { key: 'stripped', label: 'Rút hàng xong', background: '#2563EB', color: '#FFFFFF', border: '#1D4ED8' },
  ],
};

export const legendForMode = (mode: YardColorMode): readonly YardLegendEntry[] => YARD_PALETTE[mode];

export function getSlotAppearance(
  slot: YardSlot,
  visits: readonly ContainerVisit[],
  holds: readonly OperationalHold[],
  inspections: readonly ContainerInspection[],
  mode: YardColorMode,
  holdsKnown = true,
): YardSlotAppearance {
  // Occupancy stores the visit ID; physical container IDs cannot identify a visit's lifecycle.
  const visitId = slot.occupiedByContainerId;
  const container = visitId ? visits.find((visit) => visit.id === visitId) : undefined;
  const hold = Boolean(visitId && (
    holds.some((item) => item.containerVisitId === visitId && item.status === 'ACTIVE') ||
    inspections.some((item) => item.containerVisitId === visitId && item.status === 'COMPLETED' && item.result === 'HOLD')
  ));
  const occupied = Boolean(visitId || slot.occupiedByContainerNumber);

  let key = 'occupied';
  if (!slot.operational) {
    key = 'maintenance';
  } else if (!occupied) {
    key = slot.reeferPower ? 'reefer' : 'empty';
  } else if (mode === 'STATE') {
    if (!holdsKnown) key = 'unverified';
    else if (hold) key = 'hold';
    else if (container?.state === 'UNDER_INSPECTION' || (visitId && inspections.some(
      item => item.containerVisitId === visitId && item.status === 'IN_PROGRESS',
    ))) key = 'inspection';
    else if (container?.state === 'GATE_PASS_ISSUED') key = 'gate-pass';
    else if (container?.state === 'STRIPPED') key = 'stripped';
    else if (container?.state === 'IN_YARD') key = 'in-yard';
  }

  const appearance = YARD_PALETTE[mode].find((entry) => entry.key === key)!;
  return { ...appearance, hold, container };
}

const coordinateCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const compareCoordinates = (left: string, right: string): number =>
  coordinateCollator.compare(left, right) || left.localeCompare(right, 'en');

export function getBlockGeometry(slots: readonly YardSlot[]): { rows: string[]; bays: string[]; tiers: string[] } {
  const labels = (property: 'rowNo' | 'bayNo' | 'tierNo') =>
    [...new Set(slots.map((slot) => String(slot[property])))].sort(compareCoordinates);
  return { rows: labels('rowNo'), bays: labels('bayNo'), tiers: labels('tierNo') };
}

export function getSlotsAt(
  slots: readonly YardSlot[],
  row: string | number,
  bay: string | number,
  tier?: string | number,
): YardSlot[] {
  return slots.filter((slot) =>
    String(slot.rowNo) === String(row) &&
    String(slot.bayNo) === String(bay) &&
    (tier === undefined || String(slot.tierNo) === String(tier)),
  ).sort((left, right) =>
    compareCoordinates(String(left.tierNo), String(right.tierNo)) || compareCoordinates(left.slotCode, right.slotCode),
  );
}
