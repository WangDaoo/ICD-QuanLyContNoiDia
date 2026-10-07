export function validateGateInInput(input: {
  truckVisitId: string;
  actualSeal: string;
  actualWeight: string;
  expectedSeal: string;
  conditionNotes: string;
}): string | null {
  if (!input.truckVisitId) return 'Vui lòng chọn xe kéo hợp lệ để tiếp nhận.';
  if (!input.actualSeal.trim()) return 'Vui lòng nhập số seal thực tế.';
  if (
    input.actualWeight.trim() &&
    (!Number.isFinite(Number(input.actualWeight)) || Number(input.actualWeight) <= 0)
  ) {
    return 'Trọng lượng thực tế phải lớn hơn 0.';
  }
  if (
    input.expectedSeal.trim() &&
    input.actualSeal.trim().toUpperCase() !== input.expectedSeal.trim().toUpperCase() &&
    input.conditionNotes.trim().length < 3
  ) {
    return 'Seal lệch hồ sơ. Vui lòng nhập ghi chú nguyên nhân tối thiểu 3 ký tự.';
  }
  return null;
}

export function getEligibleGateInTrucks<T extends { status?: string }>(trucks: T[]): T[] {
  return trucks.filter((truck) => truck.status === 'ARRIVED' || truck.status === 'IN_PROGRESS');
}

export function getGateInBlocker(context: {
  alreadyReceived: boolean;
  containerVisit: { state: string };
  movementOrder?: { status: string; expiresAt?: string | null } | null;
}): string | null {
  if (context.alreadyReceived) return 'Container đã được tiếp nhận vào ICD.';
  if (context.containerVisit.state !== 'AUTHORIZED')
    return 'Container chưa được phê duyệt tiếp nhận. Kiểm tra lệnh vận chuyển trên Web.';
  if (!context.movementOrder || context.movementOrder.status !== 'AUTHORIZED')
    return 'Chưa có lệnh vận chuyển còn hiệu lực. Liên hệ điều phối.';
  if (
    context.movementOrder.expiresAt &&
    new Date(context.movementOrder.expiresAt).getTime() <= Date.now()
  )
    return 'Lệnh vận chuyển đã hết hạn. Liên hệ điều phối.';
  return null;
}
