import type { StatusVariant } from '../../components/StatusBadge';

type InspectionDisplay = {
  statusLabel: string;
  variant: StatusVariant;
  resultLabel?: string;
};

export function getInspectionDisplay(inspection: {
  status: string;
  result?: string | null;
}): InspectionDisplay {
  switch (inspection.status) {
    case 'PENDING':
      return { statusLabel: 'Chờ giám định', variant: 'neutral' };
    case 'IN_PROGRESS':
      return { statusLabel: 'Đang giám định', variant: 'warning' };
    case 'CANCELLED':
      return { statusLabel: 'Đã hủy', variant: 'neutral' };
    case 'COMPLETED':
      switch (inspection.result) {
        case 'HOLD':
          return {
            statusLabel: 'Hoàn tất',
            variant: 'danger',
            resultLabel: 'Giữ container — chặn xuất cổng',
          };
        case 'FAIL':
          return {
            statusLabel: 'Hoàn tất',
            variant: 'danger',
            resultLabel: 'Không đạt',
          };
        case 'PASS':
          return {
            statusLabel: 'Hoàn tất',
            variant: 'success',
            resultLabel: 'Đạt giám định',
          };
        default:
          return {
            statusLabel: 'Hoàn tất',
            variant: 'neutral',
            resultLabel: inspection.result || undefined,
          };
      }
    default:
      return { statusLabel: inspection.status, variant: 'neutral' };
  }
}
