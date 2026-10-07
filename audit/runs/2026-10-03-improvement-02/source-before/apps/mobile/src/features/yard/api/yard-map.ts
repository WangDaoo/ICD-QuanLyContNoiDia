import type { InspectionRecord, YardSlot } from './yard.api';

export type YardMapHold = {
  containerVisitId: string;
  status: string;
  reason?: string;
  holdType?: string;
};

export type YardLegendEntry = {
  key: 'empty' | 'occupied' | 'maintenance' | 'reefer' | 'hold' | 'inspection';
  label: string;
  background: string;
  color: string;
  border: string;
};

// Cell text uses the palette foreground in both themes so the semantic fills stay readable.
export const YARD_SLOT_LEGEND: readonly YardLegendEntry[] = [
  { key: 'empty', label: 'Slot trống', background: '#F8FAFC', color: '#334155', border: '#CBD5E1' },
  {
    key: 'occupied',
    label: 'Có container',
    background: '#2563EB',
    color: '#FFFFFF',
    border: '#1D4ED8',
  },
  {
    key: 'maintenance',
    label: 'Bảo trì / Ngưng dùng',
    background: '#64748B',
    color: '#FFFFFF',
    border: '#475569',
  },
  {
    key: 'reefer',
    label: 'Slot lạnh trống',
    background: '#06B6D4',
    color: '#083344',
    border: '#0891B2',
  },
  {
    key: 'hold',
    label: 'Đang giữ (Hold)',
    background: '#DC2626',
    color: '#FFFFFF',
    border: '#B91C1C',
  },
  {
    key: 'inspection',
    label: 'Đang kiểm định',
    background: '#EAB308',
    color: '#422006',
    border: '#CA8A04',
  },
];

export type YardSlotAppearance = YardLegendEntry & {
  activeHolds: readonly YardMapHold[];
  inspections: readonly InspectionRecord[];
};

export type YardBlockGroup = {
  code: string;
  name?: string;
  slots: YardSlot[];
  tiers: string[];
  unlocatedSlots: YardSlot[];
};

const coordinateCollator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const compareCoordinates = (left: string, right: string): number =>
  coordinateCollator.compare(left, right) || left.localeCompare(right, 'en');
const isLocated = (slot: YardSlot): boolean =>
  [slot.rowNo, slot.bayNo, slot.tierNo].every(
    (value) => value !== undefined && value !== null && String(value).trim() !== '',
  );

export function getYardGeometry(slots: readonly YardSlot[]): {
  rows: string[];
  bays: string[];
  tiers: string[];
} {
  const locatedSlots = slots.filter(isLocated);
  const labels = (property: 'rowNo' | 'bayNo' | 'tierNo') =>
    [...new Set(locatedSlots.map((slot) => String(slot[property])))].sort(compareCoordinates);
  return { rows: labels('rowNo'), bays: labels('bayNo'), tiers: labels('tierNo') };
}

export function getYardBlocks(slots: readonly YardSlot[]): YardBlockGroup[] {
  const slotsByBlock = new Map<string, YardSlot[]>();
  for (const slot of slots) {
    const code = slot.yardBlock.blockCode;
    const blockSlots = slotsByBlock.get(code) ?? [];
    blockSlots.push(slot);
    slotsByBlock.set(code, blockSlots);
  }
  return [...slotsByBlock.entries()]
    .sort(([left], [right]) => compareCoordinates(left, right))
    .map(([code, blockSlots]) => ({
      code,
      name: blockSlots.find((slot) => slot.yardBlock.name)?.yardBlock.name,
      slots: blockSlots,
      tiers: getYardGeometry(blockSlots).tiers,
      unlocatedSlots: blockSlots.filter((slot) => !isLocated(slot)),
    }));
}

export function getSlotsAt(
  slots: readonly YardSlot[],
  row: string | number,
  bay: string | number,
  tier?: string | number,
): YardSlot[] {
  return slots
    .filter(
      (slot) =>
        isLocated(slot) &&
        String(slot.rowNo) === String(row) &&
        String(slot.bayNo) === String(bay) &&
        (tier === undefined || String(slot.tierNo) === String(tier)),
    )
    .sort(
      (left, right) =>
        compareCoordinates(String(left.tierNo), String(right.tierNo)) ||
        compareCoordinates(left.slotCode, right.slotCode),
    );
}

export function getYardSlotAppearance(
  slot: YardSlot,
  holds: readonly YardMapHold[] = [],
  inspections: readonly InspectionRecord[] = [],
): YardSlotAppearance {
  // Holds and inspections identify a visit; a physical container number cannot identify its lifecycle.
  const visitId = slot.currentContainer?.containerVisitId;
  const activeHolds = visitId
    ? holds.filter((hold) => hold.containerVisitId === visitId && hold.status === 'ACTIVE')
    : [];
  const visitInspections = visitId
    ? inspections.filter((inspection) => inspection.containerVisitId === visitId)
    : [];
  let key: YardLegendEntry['key'] = 'occupied';
  if (
    slot.status === 'MAINTENANCE' ||
    slot.operational === false ||
    slot.yardBlock.operational === false
  )
    key = 'maintenance';
  else if (slot.status !== 'OCCUPIED' && !slot.currentContainer)
    key = slot.reeferPower ? 'reefer' : 'empty';
  else if (
    activeHolds.length ||
    visitInspections.some(
      (inspection) => inspection.status === 'COMPLETED' && inspection.result === 'HOLD',
    )
  )
    key = 'hold';
  else if (visitInspections.some((inspection) => inspection.status === 'IN_PROGRESS'))
    key = 'inspection';
  const appearance = YARD_SLOT_LEGEND.find((entry) => entry.key === key)!;
  return { ...appearance, activeHolds, inspections: visitInspections };
}

export function canSelectYardSlot(slot: YardSlot): boolean {
  return (
    slot.status === 'AVAILABLE' &&
    !slot.currentContainer &&
    slot.operational !== false &&
    slot.yardBlock.operational !== false
  );
}
