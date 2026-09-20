export type MasterDataType =
  | 'SHIPPING_LINE'
  | 'CONSIGNEE'
  | 'CLEARING_AGENT'
  | 'TRANSPORTER';

export type MasterDataRecord = {
  id: string;
  type: MasterDataType;
  code: string;
  name: string;
  active: boolean;
  taxCode?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  licenseNumber?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MasterDataCatalog = {
  type: MasterDataType;
  items: MasterDataRecord[];
};

export type MasterDataSnapshot = {
  catalogs: MasterDataCatalog[];
};

export type MasterDataMutationInput = {
  code: string;
  name: string;
  active?: boolean;
  taxCode?: string;
  phone?: string;
  email?: string;
  address?: string;
  licenseNumber?: string;
};
