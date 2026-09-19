import { PERMISSION_CODES } from '../../../src/common/constants/permission-codes.constants';

export const permissions = [
  {
    code: PERMISSION_CODES.USERS_READ,
    name: 'Xem người dùng',
    description: 'Cho phép xem tài khoản người dùng ICD.',
  },

  {
    code: PERMISSION_CODES.USERS_MANAGE,
    name: 'Quản lý người dùng',
    description: 'Cho phép tạo, sửa và vô hiệu hóa người dùng ICD.',
  },

  {
    code: PERMISSION_CODES.ROLES_READ,
    name: 'Xem phân quyền',
    description: 'Cho phép xem role và permission.',
  },

  {
    code: PERMISSION_CODES.ROLES_MANAGE,
    name: 'Quản lý phân quyền',
    description: 'Cho phép quản lý role và permission mapping.',
  },

  {
    code: PERMISSION_CODES.SETTINGS_READ,
    name: 'Xem cấu hình',
    description: 'Cho phép xem cấu hình ICD.',
  },

  {
    code: PERMISSION_CODES.SETTINGS_MANAGE,
    name: 'Quản lý cấu hình',
    description: 'Cho phép thay đổi cấu hình ICD.',
  },

  {
    code: PERMISSION_CODES.MASTER_DATA_READ,
    name: 'Xem dữ liệu danh mục',
    description: 'Cho phép xem Shipping Line, Consignee, Clearing Agent và Transporter.',
  },

  {
    code: PERMISSION_CODES.MASTER_DATA_MANAGE,
    name: 'Quản lý dữ liệu danh mục',
    description: 'Cho phép tạo, cập nhật và kích hoạt/vô hiệu hóa Master Data.',
  },

  {
    code: PERMISSION_CODES.MANIFEST_READ,
    name: 'Xem manifest',
    description: 'Cho phép xem danh sách và chi tiết manifest.',
  },

  {
    code: PERMISSION_CODES.MANIFEST_CREATE,
    name: 'Tạo manifest',
    description: 'Cho phép tạo manifest mới.',
  },

  {
    code: PERMISSION_CODES.MANIFEST_UPDATE,
    name: 'Cập nhật Manifest',
    description: 'Cho phép cập nhật Manifest, MBL và HBL khi hồ sơ còn được phép chỉnh sửa.',
  },

  {
    code: PERMISSION_CODES.MANIFEST_SUBMIT,
    name: 'Nộp manifest',
    description: 'Cho phép nộp hoặc xác nhận manifest.',
  },

  {
    code: PERMISSION_CODES.MANIFEST_CANCEL,
    name: 'Hủy Manifest',
    description: 'Cho phép chuyển Manifest sang trạng thái CANCELLED.',
  },

  {
    code: PERMISSION_CODES.CONTAINER_READ,
    name: 'Xem container',
    description: 'Cho phép tra cứu thông tin container.',
  },

  {
    code: PERMISSION_CODES.CONTAINER_CREATE,
    name: 'Tạo Container Visit',
    description: 'Cho phép đăng ký container và tạo một vòng đời Container Visit mới.',
  },

  {
    code: PERMISSION_CODES.CONTAINER_UPDATE,
    name: 'Cập nhật Container Visit',
    description: 'Cho phép cập nhật thông tin Container Visit khi trạng thái nghiệp vụ cho phép.',
  },

  {
    code: PERMISSION_CODES.CONTAINER_CANCEL,
    name: 'Hủy Container Visit',
    description: 'Cho phép hủy Container Visit khi chưa bắt đầu vận hành.',
  },

  {
    code: PERMISSION_CODES.MOVEMENT_ORDER_READ,
    name: 'Xem Movement Order',
    description: 'Cho phép xem lệnh vận chuyển container về ICD.',
  },

  {
    code: PERMISSION_CODES.MOVEMENT_ORDER_CREATE,
    name: 'Tạo Movement Order',
    description: 'Cho phép tạo lệnh vận chuyển cho Container Visit.',
  },

  {
    code: PERMISSION_CODES.MOVEMENT_ORDER_UPDATE,
    name: 'Cập nhật Movement Order',
    description: 'Cho phép cập nhật Movement Order khi còn DRAFT.',
  },

  {
    code: PERMISSION_CODES.MOVEMENT_ORDER_AUTHORIZE,
    name: 'Authorize Movement Order',
    description: 'Cho phép xác nhận container được phép vận chuyển về ICD.',
  },

  {
    code: PERMISSION_CODES.MOVEMENT_ORDER_CANCEL,
    name: 'Hủy Movement Order',
    description: 'Cho phép hủy Movement Order còn DRAFT.',
  },

  {
    code: PERMISSION_CODES.TRUCK_VISIT_READ,

    name: 'Xem chuyến xe ra/vào',

    description: 'Cho phép xem Truck Visit và danh sách container thuộc chuyến.',
  },

  {
    code: PERMISSION_CODES.TRUCK_VISIT_CREATE,

    name: 'Tạo chuyến xe ra/vào',

    description: 'Cho phép tạo Truck Visit/Gate Appointment.',
  },

  {
    code: PERMISSION_CODES.TRUCK_VISIT_UPDATE,

    name: 'Cập nhật chuyến xe ra/vào',

    description: 'Cho phép cập nhật Truck Visit khi còn SCHEDULED.',
  },

  {
    code: PERMISSION_CODES.TRUCK_VISIT_ARRIVE,

    name: 'Xác nhận xe đến cổng',

    description: 'Cho phép chuyển Truck Visit từ SCHEDULED sang ARRIVED.',
  },

  {
    code: PERMISSION_CODES.TRUCK_VISIT_CANCEL,

    name: 'Hủy chuyến xe ra/vào',

    description: 'Cho phép hủy Truck Visit trước khi bắt đầu Gate-in.',
  },

  {
    code: PERMISSION_CODES.GATE_IN_CREATE,
    name: 'Tạo Gate-in',
    description: 'Cho phép thực hiện thủ tục gate-in cho container.',
  },

  {
    code: PERMISSION_CODES.YARD_READ,
    name: 'Xem bãi',
    description: 'Cho phép xem layout bãi và vị trí container.',
  },

  {
    code: PERMISSION_CODES.YARD_UPDATE,
    name: 'Cập nhật bãi',
    description: 'Cho phép điều chỉnh vị trí và trạng thái trong bãi.',
  },

  {
    code: PERMISSION_CODES.YARD_CONFIGURE,
    name: 'Cấu hình bãi container',
    description: 'Cho phép tạo và cập nhật Yard Block/Yard Slot.',
  },

  {
    code: PERMISSION_CODES.YARD_MOVE,
    name: 'Di chuyển container',
    description: 'Cho phép đảo chuyển vị trí container trong bãi.',
  },

  {
    code: PERMISSION_CODES.YARD_INSPECT,
    name: 'Giám định bãi',
    description: 'Cho phép ghi nhận hư hỏng, kiểm tra seal/tình trạng container.',
  },

  {
    code: PERMISSION_CODES.YARD_BOOKING,
    name: 'Đặt chỗ tác nghiệp bãi',
    description: 'Cho phép đặt lịch rút ruột, đóng hàng, hoặc giám định tại bãi.',
  },

  {
    code: PERMISSION_CODES.BILLING_READ,
    name: 'Xem tính cước & biểu phí',
    description: 'Cho phép xem biểu phí, danh sách Service Order và phí dự tính.',
  },

  {
    code: PERMISSION_CODES.BILLING_MANAGE,
    name: 'Quản lý tính cước',
    description: 'Cho phép tạo, cập nhật và xác nhận Service Order.',
  },

  {
    code: PERMISSION_CODES.TARIFF_MANAGE,
    name: 'Quản lý biểu phí',
    description: 'Cho phép tạo, chỉnh sửa, thêm rule và kích hoạt biểu cước dịch vụ.',
  },

  {
    code: PERMISSION_CODES.OPERATIONAL_HOLD_READ,
    name: 'Xem Operational Hold',
    description: 'Cho phép xem danh sách và trạng thái các lệnh tạm giữ tác nghiệp container.',
  },

  {
    code: PERMISSION_CODES.OPERATIONAL_HOLD_MANAGE,
    name: 'Quản lý Operational Hold',
    description: 'Cho phép đặt và gỡ bỏ các lệnh tạm giữ tác nghiệp (Customs, Damage, etc.).',
  },

  {
    code: PERMISSION_CODES.GATE_PASS_CREATE,
    name: 'Tạo Gate Pass',
    description: 'Cho phép cấp phiếu giao nhận container qua cổng.',
  },

  {
    code: PERMISSION_CODES.GATE_PASS_USE,
    name: 'Sử dụng Gate Pass',
    description: 'Cho phép xác thực và hoàn tất phiếu gate pass tại cổng.',
  },

  {
    code: PERMISSION_CODES.REPORTS_READ,
    name: 'Xem báo cáo',
    description: 'Cho phép xem thống kê và báo cáo vận hành bãi ICD.',
  },

  {
    code: PERMISSION_CODES.HANDOVER_CREATE,
    name: 'Tạo biên bản bàn giao',
    description: 'Cho phép tạo biên bản bàn giao cho chặng vận chuyển tiếp theo.',
  },

  {
    code: PERMISSION_CODES.HANDOVER_READ,
    name: 'Xem biên bản bàn giao',
    description: 'Cho phép tra cứu và theo dõi trạng thái biên bản bàn giao.',
  },

  {
    code: PERMISSION_CODES.HANDOVER_CONFIRM,
    name: 'Xác nhận bàn giao',
    description: 'Cho phép xác nhận tiếp nhận hoặc bàn giao container thành công.',
  },

  {
    code: PERMISSION_CODES.HANDOVER_DISPUTE,
    name: 'Ghi nhận tranh chấp bàn giao',
    description: 'Cho phép ghi nhận khiếu nại hoặc sự cố bất thường khi bàn giao.',
  },

  {
    code: PERMISSION_CODES.PARTNER_CLIENT_MANAGE,
    name: 'Quản lý đối tác tích hợp',
    description: 'Cho phép quản lý API key và quyền truy cập của hệ thống đối tác.',
  },

  {
    code: PERMISSION_CODES.PARTNER_API_LOG_READ,
    name: 'Xem log tích hợp',
    description: 'Cho phép xem lịch sử gọi API tích hợp từ đối tác bên ngoài.',
  },
] as const;
