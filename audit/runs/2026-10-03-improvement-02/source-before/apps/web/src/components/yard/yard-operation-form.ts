import type { ContainerVisit, YardBlock, YardSlot } from '../../types';

export type YardOperationAction = 'MOVE' | 'BOOKING' | 'INSPECTION';
export type BookingCompletion = {
  actualPackages?: number;
  actualWeightKg?: number;
  conditionNotes?: string;
};

export function canWriteYardOperation(
  permissions: string[] | undefined,
  action: YardOperationAction,
): boolean {
  const permission = { MOVE: 'yard.move', BOOKING: 'yard.booking', INSPECTION: 'yard.inspect' }[
    action
  ];
  return !!permissions?.some((code) => code === '*' || code === permission);
}

export function formatLocalDateTime(date = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseLocalDateTime(value: string): { iso?: string; error?: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return { error: 'Vui lòng nhập ngày giờ dự kiến hợp lệ.' };
  const [year, month, day, hour, minute] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  )
    return { error: 'Ngày giờ dự kiến không hợp lệ.' };
  return { iso: date.toISOString() };
}

export function parseBookingSchedule(formData: FormData): { iso?: string; error?: string } {
  const scheduledAt = formData.get('scheduledAt');
  return parseLocalDateTime(typeof scheduledAt === 'string' ? scheduledAt : '');
}

export function parseBookingCompletion(
  packages: string,
  weight: string,
  notes: string,
): { values?: BookingCompletion; error?: string } {
  const packageText = packages.trim();
  const weightText = weight.trim();
  if (packageText && (!/^\d+$/.test(packageText) || !Number.isSafeInteger(Number(packageText)))) {
    return { error: 'Số kiện thực tế phải là số nguyên không âm.' };
  }
  if (
    weightText &&
    (!/^\d+(?:\.\d{1,3})?$/.test(weightText) || !Number.isFinite(Number(weightText)))
  ) {
    return { error: 'Trọng lượng thực tế phải là số không âm, tối đa 3 chữ số thập phân.' };
  }
  return {
    values: {
      actualPackages: packageText ? Number(packageText) : undefined,
      actualWeightKg: weightText ? Number(weightText) : undefined,
      conditionNotes: notes.trim() || undefined,
    },
  };
}

export function findMovementDestinations(
  slots: YardSlot[],
  blocks: YardBlock[],
  visit?: ContainerVisit,
): YardSlot[] {
  return slots.filter((slot) => {
    if (
      !slot.operational ||
      slot.occupiedByContainerId ||
      !blocks.some((block) => block.blockCode === slot.blockCode && block.operational)
    )
      return false;
    // Display ISO types and manifest weight cannot replace the backend's canonical
    // type and effective reception weight when validating a destination.
    return !visit || slot.slotCode !== visit.currentLocation;
  });
}

export function validateInspectionResult(
  result: 'PASS' | 'FAIL' | 'HOLD',
  notes: string,
): string | undefined {
  return result !== 'PASS' && !notes.trim()
    ? 'Vui lòng nhập ghi chú khi kết quả là FAIL hoặc HOLD.'
    : undefined;
}
