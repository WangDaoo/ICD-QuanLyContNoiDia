import { ROLE_CODES } from '../../../src/common/constants/role-codes.constants';

export const roles = [
  {
    code: ROLE_CODES.ADMIN,
    name: 'Quản trị viên',
    description: 'Quản trị hệ thống, người dùng, cấu hình, tích hợp và dữ liệu nền.',
  },

  {
    code: ROLE_CODES.MANAGER,
    name: 'Quản lý',
    description: 'Giám sát nghiệp vụ, báo cáo, audit, EDI và bàn giao vận chuyển.',
  },

  {
    code: ROLE_CODES.OPERATOR,
    name: 'Nhân viên vận hành',
    description: 'Thực hiện nghiệp vụ vận hành chính của ICD.',
  },

  {
    code: ROLE_CODES.GATE_STAFF,
    name: 'Nhân viên cổng',
    description: 'Thực hiện Truck Visit, Gate-in và Gate-out.',
  },

  {
    code: ROLE_CODES.YARD_STAFF,
    name: 'Nhân viên bãi',
    description: 'Thực hiện các nghiệp vụ tại bãi.',
  },

  {
    code: ROLE_CODES.AGENT,
    name: 'Đại lý',
    description: 'Tra cứu dữ liệu theo phạm vi được ICD cấp quyền.',
  },

  {
    code: ROLE_CODES.CONSIGNEE,
    name: 'Chủ hàng',
    description: 'Tra cứu dữ liệu theo phạm vi chủ hàng.',
  },
] as const;
