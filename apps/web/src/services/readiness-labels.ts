const labels: Record<string, string> = {
  CONTAINER_NOT_IN_YARD: 'Container không ở trạng thái trong bãi.',
  NO_YARD_POSITION: 'Container chưa có vị trí trong bãi.',
  NO_BILLING: 'Chưa có hồ sơ tính phí.',
  BILLING_INCOMPLETE: 'Thanh toán chưa hoàn tất.',
  BILLING_CONFIGURATION_MISSING: 'Chưa đủ cấu hình biểu phí.',
  UNBILLED_SERVICES: 'Còn dịch vụ chưa được tính phí.',
  ACTIVE_YARD_OPERATION: 'Còn tác nghiệp bãi đang thực hiện.',
  INSPECTION_HOLD: 'Container đang bị giữ để kiểm định.',
  OPERATIONAL_HOLD: 'Container đang bị giữ theo nghiệp vụ.',
};
export const readinessLabel = (code: string) => labels[code] ?? code;
