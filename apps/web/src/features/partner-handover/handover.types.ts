export type HandoverStatus =
  | 'DRAFT'
  | 'READY_FOR_HANDOVER'
  | 'PARTNER_ACCEPTED'
  | 'IN_TRANSIT'
  | 'PARTNER_CONFIRMED'
  | 'ICD_CONFIRMED'
  | 'COMPLETED'
  | 'PARTNER_REJECTED'
  | 'DELIVERY_FAILED'
  | 'DISPUTED'
  | 'CANCELLED'
  | string;

export type PartnerClientOption = {
  id: string;

  code?: string | null;

  name: string;

  status: string;

  keyLast4?: string | null;
};

export type WarehouseOption = {
  id: string;

  code?: string | null;

  name: string;

  address?: string | null;

  active: boolean;
};

export type TransportConfirmation = {
  id: string;

  type: string;

  confirmedAt?: string | null;

  partnerRequestId?: string | null;

  partnerReference?: string | null;

  receiverName?: string | null;

  receiverPhone?: string | null;

  condition?: string | null;

  note?: string | null;

  latitude?: number | null;

  longitude?: number | null;

  accuracyM?: number | null;

  proofImageUrl?: string | null;

  signatureUrl?: string | null;

  payloadSnapshot?: unknown;

  createdAt?: string | null;
};

export type TransportHandover = {
  id: string;

  handoverNumber?: string | null;

  transportCode: string;

  status: HandoverStatus;

  version?: number | null;

  visitId: string;

  containerNumber?: string | null;

  containerStatus?: string | null;

  partnerApiClientId?: string | null;

  partnerCode?: string | null;

  partnerName?: string | null;

  warehouseId?: string | null;

  warehouseCode?: string | null;

  warehouseName?: string | null;

  warehouseAddress?: string | null;

  expectedDeliveryAt?: string | null;

  readyAt?: string | null;

  partnerAcceptedAt?: string | null;

  departedAt?: string | null;

  partnerConfirmedAt?: string | null;

  icdConfirmedAt?: string | null;

  completedAt?: string | null;

  createdAt?: string | null;

  updatedAt?: string | null;

  confirmations: TransportConfirmation[];
};

export type HandoverSummary = {
  visitId: string;

  handover?: TransportHandover | null;
};

export type CreateHandoverInput = {
  visitId: string;

  partnerApiClientId: string;

  warehouseId: string;

  transportCode: string;

  expectedDeliveryAt?: string;

  note?: string;
};

export type ConfirmHandoverInput = {
  note?: string;
};

export type DisputeHandoverInput = {
  reasonCode: string;

  note: string;

  attachmentUrl?: string;
};

export type HandoverCreateOptions = {
  partners: PartnerClientOption[];

  warehouses: WarehouseOption[];
};
