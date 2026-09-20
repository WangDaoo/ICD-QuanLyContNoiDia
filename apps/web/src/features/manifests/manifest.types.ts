export type ManifestStatus =
  | 'DRAFT'
  | 'OPEN'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'CANCELLED'
  | string;

export type ManifestListItem = {
  id: string;
  manifestNumber: string;
  status: ManifestStatus;

  vesselName?: string | null;
  voyageNumber?: string | null;

  shippingLineName?: string | null;

  eta?: string | null;
  ata?: string | null;

  masterBlCount: number;
  houseBlCount: number;
  containerCount: number;

  createdAt?: string | null;
};

export type ManifestContainer = {
  id: string;
  visitId?: string | null;

  containerNumber: string;

  size?: string | null;
  type?: string | null;
  isoCode?: string | null;

  status?: string | null;
};

export type ManifestHouseBl = {
  id: string;
  number: string;

  consigneeName?: string | null;

  containers: ManifestContainer[];
};

export type ManifestMasterBl = {
  id: string;
  number: string;

  shippingLineName?: string | null;

  houseBls: ManifestHouseBl[];
};

export type ManifestDetail = {
  id: string;
  manifestNumber: string;

  status: ManifestStatus;

  vesselName?: string | null;
  voyageNumber?: string | null;

  shippingLineName?: string | null;

  eta?: string | null;
  ata?: string | null;

  notes?: string | null;

  masterBls: ManifestMasterBl[];

  createdAt?: string | null;
  updatedAt?: string | null;
};
