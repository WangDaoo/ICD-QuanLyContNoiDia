export const serviceTypes = [
  {
    code: 'RECEPTION',
    name: 'Tiếp nhận container',
    unit: 'CONTAINER',
    description: 'Phí tiếp nhận container vào bãi ICD',
  },
  {
    code: 'STORAGE',
    name: 'Lưu bãi container',
    unit: 'DAY',
    description: 'Phí lưu bãi container tính theo ngày',
  },
  {
    code: 'STRIPPING',
    name: 'Rút ruột container',
    unit: 'CONTAINER',
    description: 'Phí rút ruột hàng hóa trong bãi',
  },
  {
    code: 'INSPECTION',
    name: 'Giám định container',
    unit: 'CONTAINER',
    description: 'Phí giám định tình trạng container',
  },
  {
    code: 'MOVEMENT',
    name: 'Đảo chuyển nội bãi',
    unit: 'MOVE',
    description: 'Phí đảo chuyển vị trí container trong bãi',
  },
] as const;
