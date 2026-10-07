import type { GatePass } from '../types';

export function effectiveGatePassStatus(pass: GatePass, now = Date.now()): GatePass['status'] {
  if (pass.status !== 'ACTIVE') return pass.status;
  const expiry = new Date(pass.expiresAt).getTime();
  return Number.isFinite(expiry) && expiry > now ? 'ACTIVE' : 'EXPIRED';
}

export function gatePassStatusMessage(status: GatePass['status']): string {
  return { ACTIVE: 'Phiếu còn hiệu lực. Đối soát phương tiện trước khi xác nhận ra cổng.', USED: 'Phiếu đã được sử dụng để ra cổng.', EXPIRED: 'Phiếu đã hết hạn. Cần phát hành phiếu mới sau khi kiểm tra điều kiện.', CANCELLED: 'Phiếu đã hủy. Không thể sử dụng để ra cổng.', UNKNOWN: 'Chưa xác định được trạng thái phiếu. Tải lại dữ liệu trước khi thao tác ra cổng.' }[status];
}
