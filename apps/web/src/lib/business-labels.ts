/**
 * Business vocabulary for the operations UI.
 *
 * Backend enums stay in English (they are the contract). Office and gate staff
 * read Vietnamese, so every status/type shown on screen goes through this map.
 * Labels only describe a state; they never decide what action is allowed —
 * the backend remains the source of truth for readiness and transitions.
 */

export type BusinessTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral';

interface LabelEntry {
  label: string;
  tone: BusinessTone;
  /** Optional one-line explanation for tooltips / helper text. */
  hint?: string;
}

type Dictionary = Readonly<Record<string, LabelEntry>>;

const entry = (label: string, tone: BusinessTone, hint?: string): LabelEntry =>
  hint ? { label, tone, hint } : { label, tone };

const containerVisitStatus: Dictionary = {
  PENDING: entry('Chờ cấp lệnh', 'neutral', 'Đã có trong lược khai, chưa được cấp lệnh vận chuyển.'),
  AUTHORIZED: entry('Chờ vào cổng', 'info', 'Đã có lệnh vận chuyển, chờ xe đưa container vào cổng.'),
  IN_YARD: entry('Trong bãi', 'success', 'Đã tiếp nhận vào bãi.'),
  IN_STRIPPING: entry('Đang rút hàng', 'primary'),
  STRIPPED: entry('Đã rút hàng', 'primary'),
  UNDER_INSPECTION: entry('Đang kiểm hóa', 'warning'),
  GATE_PASS_ISSUED: entry('Đã cấp phiếu ra cổng', 'info', 'Chờ xe đến nhận và xác nhận ra cổng.'),
  EXITED: entry('Đã ra cổng', 'neutral'),
  CANCELLED: entry('Đã hủy', 'danger'),
};

const movementOrderStatus: Dictionary = {
  DRAFT: entry('Nháp', 'neutral', 'Chưa có hiệu lực, cần duyệt lệnh.'),
  AUTHORIZED: entry('Đã duyệt', 'success'),
  EXPIRED: entry('Hết hạn', 'warning'),
  CANCELLED: entry('Đã hủy', 'danger'),
};

const truckVisitStatus: Dictionary = {
  SCHEDULED: entry('Đã hẹn lịch', 'neutral', 'Xe chưa đến cổng.'),
  ARRIVED: entry('Xe đã đến cổng', 'info', 'Sẵn sàng làm thủ tục tại cổng.'),
  IN_PROGRESS: entry('Đang làm thủ tục', 'primary'),
  COMPLETED: entry('Hoàn tất', 'success'),
  CANCELLED: entry('Đã hủy', 'danger'),
};

const truckVisitType: Dictionary = {
  GATE_IN: entry('Chuyến giao container vào bãi', 'info'),
  GATE_OUT: entry('Chuyến nhận container ra', 'primary'),
};

const yardTaskStatus: Dictionary = {
  PENDING: entry('Chờ thực hiện', 'neutral'),
  IN_PROGRESS: entry('Đang thực hiện', 'info'),
  COMPLETED: entry('Hoàn tất', 'success'),
  CANCELLED: entry('Đã hủy', 'danger'),
};

const inspectionResult: Dictionary = {
  PASS: entry('Đạt', 'success'),
  FAIL: entry('Không đạt', 'danger'),
  HOLD: entry('Tạm giữ', 'warning'),
};

const bookingType: Dictionary = {
  STRIPPING: entry('Rút hàng', 'primary'),
  STUFFING: entry('Đóng hàng', 'primary'),
  INSPECTION: entry('Kiểm hóa', 'warning'),
};

const holdType: Dictionary = {
  CUSTOMS: entry('Hải quan', 'warning'),
  SHIPPING_LINE: entry('Hãng tàu', 'warning'),
  DAMAGE: entry('Hư hỏng', 'danger'),
  SECURITY: entry('An ninh', 'danger'),
  DOCUMENT: entry('Chứng từ', 'warning'),
  OTHER: entry('Khác', 'neutral'),
};

const holdStatus: Dictionary = {
  ACTIVE: entry('Đang giữ', 'danger'),
  RELEASED: entry('Đã gỡ giữ', 'success'),
};

const serviceOrderStatus: Dictionary = {
  DRAFT: entry('Nháp', 'neutral', 'Chưa tính tiền, có thể sửa dịch vụ.'),
  CONFIRMED: entry('Đã xác nhận', 'info', 'Chờ xuất hóa đơn.'),
  INVOICED: entry('Đã xuất hóa đơn', 'primary'),
  PAID: entry('Đã thanh toán', 'success'),
  CANCELLED: entry('Đã hủy', 'danger'),
};

const invoiceStatus: Dictionary = {
  UNPAID: entry('Chưa thanh toán', 'danger'),
  PARTIALLY_PAID: entry('Thanh toán một phần', 'warning'),
  PAID: entry('Đã thanh toán đủ', 'success'),
  VOID: entry('Đã hủy', 'neutral'),
};

const paymentMethod: Dictionary = {
  CASH: entry('Tiền mặt', 'neutral'),
  TIEN_MAT: entry('Tiền mặt', 'neutral'),
  BANK_TRANSFER: entry('Chuyển khoản', 'neutral'),
  CHUYEN_KHOAN: entry('Chuyển khoản', 'neutral'),
  THE: entry('Thẻ', 'neutral'),
  UNKNOWN: entry('Không xác định', 'neutral'),
};

const gatePassStatus: Dictionary = {
  ACTIVE: entry('Còn hiệu lực', 'success'),
  USED: entry('Đã ra cổng', 'neutral'),
  EXPIRED: entry('Hết hạn', 'warning'),
  CANCELLED: entry('Đã hủy', 'danger'),
  UNKNOWN: entry('Không xác định', 'neutral'),
};

const manifestStatus: Dictionary = {
  DRAFT: entry('Nháp', 'neutral', 'Còn sửa được; chưa sinh container chờ vào cổng.'),
  SUBMITTED: entry('Đã nộp', 'success'),
  CANCELLED: entry('Đã hủy', 'danger'),
};

const tariffStatus: Dictionary = {
  DRAFT: entry('Nháp', 'neutral'),
  ACTIVE: entry('Đang áp dụng', 'success'),
  RETIRED: entry('Ngừng áp dụng', 'neutral'),
};

const ediOutboxStatus: Dictionary = {
  PENDING: entry('Chờ gửi', 'neutral'),
  PROCESSING: entry('Đang gửi', 'info'),
  SENT: entry('Đã gửi', 'success'),
  FAILED: entry('Gửi lỗi – sẽ thử lại', 'warning'),
  DEAD: entry('Gửi thất bại – cần xử lý', 'danger'),
};

const ediAckStatus: Dictionary = {
  ACCEPTED: entry('Hãng tàu đã chấp nhận', 'success'),
  REJECTED: entry('Hãng tàu từ chối', 'danger'),
  ERROR: entry('Phản hồi lỗi', 'danger'),
  UNMATCHED: entry('Phản hồi không khớp', 'warning'),
};

const ediMessageType: Dictionary = {
  CODECO_GATE_IN: entry('Báo vào cổng (CODECO)', 'info'),
  CODECO_GATE_OUT: entry('Báo ra cổng (CODECO)', 'info'),
  COREOR: entry('Lệnh giao hàng (COREOR)', 'info'),
};

const ediAlertStatus: Dictionary = {
  OPEN: entry('Chưa xử lý', 'danger'),
  ACKNOWLEDGED: entry('Đã tiếp nhận', 'warning'),
  RESOLVED: entry('Đã xử lý', 'success'),
};

const ediAlertSeverity: Dictionary = {
  WARNING: entry('Cảnh báo', 'warning'),
  ERROR: entry('Lỗi', 'danger'),
  CRITICAL: entry('Nghiêm trọng', 'danger'),
};

const handoverStatus: Dictionary = {
  DRAFT: entry('Nháp', 'neutral'),
  READY_FOR_HANDOVER: entry('Sẵn sàng bàn giao', 'info', 'Chờ đối tác vận chuyển nhận lệnh.'),
  PARTNER_ACCEPTED: entry('Đối tác đã nhận lệnh', 'info'),
  IN_TRANSIT: entry('Đang vận chuyển', 'primary'),
  PARTNER_CONFIRMED: entry('Đối tác báo đã giao – chờ ICD duyệt', 'warning'),
  ICD_CONFIRMED: entry('ICD đã xác nhận', 'success'),
  COMPLETED: entry('Hoàn tất', 'success'),
  PARTNER_REJECTED: entry('Đối tác từ chối', 'danger'),
  DELIVERY_FAILED: entry('Giao hàng thất bại', 'danger'),
  DISPUTED: entry('Đang tranh chấp', 'danger'),
  CANCELLED: entry('Đã hủy', 'neutral'),
};

const transportConfirmationType: Dictionary = {
  PARTNER_ACCEPTED: entry('Đối tác nhận lệnh', 'info'),
  IN_TRANSIT: entry('Bắt đầu vận chuyển', 'primary'),
  WAREHOUSE_RECEIVED: entry('Kho khách hàng đã nhận', 'success'),
  DELIVERY_FAILED: entry('Giao thất bại', 'danger'),
  ICD_CONFIRMED: entry('ICD xác nhận', 'success'),
  DISPUTE: entry('Khiếu nại', 'danger'),
};

const partnerClientStatus: Dictionary = {
  ACTIVE: entry('Đang hoạt động', 'success'),
  REVOKED: entry('Đã thu hồi', 'neutral'),
};

const taskUrgency: Dictionary = {
  OVERDUE: entry('Quá hạn', 'danger'),
  HIGH: entry('Ưu tiên cao', 'warning'),
  MEDIUM: entry('Trung bình', 'info'),
  NORMAL: entry('Bình thường', 'neutral'),
};

const taskType: Dictionary = {
  GATE_IN: entry('Tiếp nhận vào cổng', 'info'),
  YARD_ASSIGN: entry('Xếp vị trí bãi', 'primary'),
  YARD_OPERATIONS: entry('Tác nghiệp bãi', 'primary'),
  BILLING: entry('Dịch vụ & thanh toán', 'warning'),
  GATE_OUT: entry('Ra cổng', 'info'),
  HANDOVER_REVIEW: entry('Duyệt bàn giao', 'warning'),
  SYSTEM: entry('Hệ thống', 'neutral'),
};

const role: Dictionary = {
  ADMIN: entry('Quản trị hệ thống', 'primary'),
  MANAGER: entry('Quản lý', 'primary'),
  OPERATOR: entry('Điều phối', 'info'),
  GATE_STAFF: entry('Nhân viên cổng', 'info'),
  YARD_STAFF: entry('Nhân viên bãi', 'info'),
  AGENT: entry('Đại lý', 'neutral'),
  CONSIGNEE: entry('Chủ hàng', 'neutral'),
  PARTNER_SYSTEM: entry('Hệ thống đối tác', 'neutral'),
};

const fullEmpty: Dictionary = {
  FULL: entry('Có hàng', 'neutral'),
  EMPTY: entry('Rỗng', 'neutral'),
  UNKNOWN: entry('Chưa rõ', 'neutral'),
};

const cargoCategory: Dictionary = {
  IMPORT: entry('Nhập', 'neutral'),
  EXPORT: entry('Xuất', 'neutral'),
  STORAGE: entry('Lưu bãi', 'neutral'),
};

const yardLocationSource: Dictionary = {
  MANUAL: entry('Xếp thủ công', 'neutral'),
  RULE: entry('Theo quy tắc', 'neutral'),
  ML: entry('Theo gợi ý', 'neutral'),
  MOVEMENT: entry('Theo lệnh đảo chuyển', 'neutral'),
};

const activeFlag: Dictionary = {
  true: entry('Đang hoạt động', 'success'),
  false: entry('Ngừng hoạt động', 'neutral'),
};

const containerType: Dictionary = {
  '20GP': entry("20' khô", 'neutral', 'Container 20 feet thường (20GP)'),
  '40GP': entry("40' khô", 'neutral', 'Container 40 feet thường (40GP)'),
  '40HC': entry("40' cao", 'neutral', 'Container 40 feet cao – High Cube (40HC)'),
  '45HC': entry("45' cao", 'neutral', 'Container 45 feet cao – High Cube (45HC)'),
  '20RF': entry("20' lạnh", 'info', 'Container lạnh 20 feet (20RF) – cần ổ cắm điện'),
  '40RF': entry("40' lạnh", 'info', 'Container lạnh 40 feet (40RF) – cần ổ cắm điện'),
};

const yardOperationType: Dictionary = {
  MOVEMENT: entry('Đảo chuyển vị trí', 'info'),
  INSPECTION: entry('Kiểm hóa / giám định', 'warning'),
  BOOKING: entry('Rút / đóng hàng', 'info'),
};

const ediAlertType: Dictionary = {
  DELIVERY_FAILURE: entry('Gửi điện thất bại', 'danger'),
  ACK_REJECTED: entry('Hãng tàu từ chối điện', 'danger'),
  ACK_ERROR: entry('Phản hồi điện bị lỗi', 'danger'),
  ACK_UNMATCHED: entry('Phản hồi không khớp điện đã gửi', 'warning'),
};

const ediTransport: Dictionary = {
  MOCK: entry('Mô phỏng (không gửi thật)', 'warning'),
  HTTPS: entry('Kết nối HTTPS', 'neutral'),
  SFTP: entry('Kết nối SFTP', 'neutral'),
};

export const BUSINESS_DICTIONARIES = {
  containerType,
  yardOperationType,
  ediAlertType,
  ediTransport,
  containerVisitStatus,
  movementOrderStatus,
  truckVisitStatus,
  truckVisitType,
  yardTaskStatus,
  inspectionResult,
  bookingType,
  holdType,
  holdStatus,
  serviceOrderStatus,
  invoiceStatus,
  paymentMethod,
  gatePassStatus,
  manifestStatus,
  tariffStatus,
  ediOutboxStatus,
  ediAckStatus,
  ediMessageType,
  ediAlertStatus,
  ediAlertSeverity,
  handoverStatus,
  transportConfirmationType,
  partnerClientStatus,
  taskUrgency,
  taskType,
  role,
  fullEmpty,
  cargoCategory,
  yardLocationSource,
  activeFlag,
} as const;

export type BusinessDomain = keyof typeof BUSINESS_DICTIONARIES;

const lookup = (domain: BusinessDomain, code: string | boolean | null | undefined): LabelEntry | undefined => {
  if (code === null || code === undefined || code === '') return undefined;
  return BUSINESS_DICTIONARIES[domain][String(code)];
};

/** Vietnamese label for a backend code; unknown codes are shown as-is so nothing is hidden. */
export function businessLabel(domain: BusinessDomain, code: string | boolean | null | undefined): string {
  if (code === null || code === undefined || code === '') return '—';
  return lookup(domain, code)?.label ?? String(code);
}

export function businessTone(domain: BusinessDomain, code: string | boolean | null | undefined): BusinessTone {
  return lookup(domain, code)?.tone ?? 'neutral';
}

export function businessHint(domain: BusinessDomain, code: string | boolean | null | undefined): string | undefined {
  return lookup(domain, code)?.hint;
}

/** Options for <select> filters, in dictionary order. */
export function businessOptions(
  domain: BusinessDomain,
  codes?: readonly string[],
): Array<{ value: string; label: string }> {
  const dictionary = BUSINESS_DICTIONARIES[domain];
  const keys = codes ?? Object.keys(dictionary);
  return keys.map((value) => ({ value, label: dictionary[value]?.label ?? value }));
}

/** Tailwind classes per tone. Pairs keep ≥ 4.5:1 contrast on light surfaces. */
export const TONE_CLASSES: Readonly<Record<BusinessTone, string>> = {
  success: 'bg-emerald-100 text-emerald-900 ring-emerald-200',
  warning: 'bg-amber-100 text-amber-900 ring-amber-200',
  danger: 'bg-rose-100 text-rose-900 ring-rose-200',
  info: 'bg-sky-100 text-sky-900 ring-sky-200',
  primary: 'bg-indigo-100 text-indigo-900 ring-indigo-200',
  neutral: 'bg-slate-100 text-slate-800 ring-slate-200',
};
