import type { MasterDataType } from './master-data.types';

export type MasterDataFieldKey =
  | 'code'
  | 'name'
  | 'taxCode'
  | 'phone'
  | 'email'
  | 'address'
  | 'licenseNumber';

export type MasterDataFieldDefinition = {
  key: MasterDataFieldKey;
  label: string;
  required?: boolean;
  type?: 'text' | 'email' | 'textarea';
  placeholder?: string;
};

export type MasterDataTypeDefinition = {
  type: MasterDataType;
  label: string;
  shortLabel: string;
  description: string;
  fields: MasterDataFieldDefinition[];
};

export const MASTER_DATA_TYPES: MasterDataTypeDefinition[] = [
  {
    type: 'SHIPPING_LINE',
    label: 'Shipping Line',
    shortLabel: 'Hãng tàu',
    description: 'Danh mục hãng tàu phục vụ Manifest và EDI routing.',
    fields: [
      {
        key: 'code',
        label: 'SCAC / Code',
        required: true,
        placeholder: 'MAEU',
      },
      {
        key: 'name',
        label: 'Tên hãng tàu',
        required: true,
        placeholder: 'Maersk Line',
      },
    ],
  },
  {
    type: 'CONSIGNEE',
    label: 'Consignee',
    shortLabel: 'Chủ hàng',
    description: 'Thông tin doanh nghiệp/chủ hàng nhận container.',
    fields: [
      {
        key: 'code',
        label: 'Mã Consignee',
        required: true,
      },
      {
        key: 'name',
        label: 'Tên',
        required: true,
      },
      {
        key: 'taxCode',
        label: 'Mã số thuế',
      },
      {
        key: 'phone',
        label: 'Số điện thoại',
      },
      {
        key: 'email',
        label: 'Email',
        type: 'email',
      },
      {
        key: 'address',
        label: 'Địa chỉ',
        type: 'textarea',
      },
    ],
  },
  {
    type: 'CLEARING_AGENT',
    label: 'Clearing Agent',
    shortLabel: 'Đại lý khai báo',
    description: 'Đơn vị đại lý thực hiện thủ tục thông quan.',
    fields: [
      {
        key: 'code',
        label: 'Mã Agent',
        required: true,
      },
      {
        key: 'name',
        label: 'Tên',
        required: true,
      },
      {
        key: 'licenseNumber',
        label: 'Số phép',
      },
    ],
  },
  {
    type: 'TRANSPORTER',
    label: 'Transporter',
    shortLabel: 'Đơn vị vận tải',
    description: 'Danh mục đơn vị vận chuyển container.',
    fields: [
      {
        key: 'code',
        label: 'Mã Transporter',
        required: true,
      },
      {
        key: 'name',
        label: 'Tên',
        required: true,
      },
      {
        key: 'taxCode',
        label: 'Mã số thuế',
      },
      {
        key: 'phone',
        label: 'Số điện thoại',
      },
    ],
  },
];

export function getMasterDataDefinition(
  type: MasterDataType,
): MasterDataTypeDefinition {
  const definition = MASTER_DATA_TYPES.find((item) => item.type === type);
  if (!definition) {
    throw new Error(`Master Data type không hỗ trợ: ${type}`);
  }
  return definition;
}
