export type GateOutReceipt = {
  containerVisitId: string;
  containerNumber?: string;
  gatePassCode?: string;
  gateOutAt: string;
  status: string;
};

export async function confirmGateOutReceipt(
  visitId: string,
  qrToken: string,
  confirm: (visitId: string, qrToken: string) => Promise<GateOutReceipt>,
): Promise<GateOutReceipt> {
  const receipt = await confirm(visitId, qrToken);
  if (receipt.containerVisitId !== visitId || receipt.status !== 'EXITED' || !receipt.gateOutAt) {
    throw new Error(
      'Hệ thống chưa xác nhận xe ra cổng thành công. Vui lòng kiểm tra lại phiếu hoặc liên hệ điều phối.',
    );
  }
  return receipt;
}
import type { GatePassScan } from './api/gate-out.api';

export function canReviewGateOut(scan: GatePassScan | null, visitId: string): boolean {
  return (
    !!scan &&
    scan.visitId === visitId &&
    scan.canGateOut &&
    scan.readiness.ready &&
    scan.readiness.blockers.length === 0 &&
    scan.gatePass.status === 'ACTIVE' &&
    new Date(scan.gatePass.expiresAt).getTime() > Date.now()
  );
}
