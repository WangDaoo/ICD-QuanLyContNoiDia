import type { Request } from 'express';
import type {
  CustomerWarehouse,
  TransportConfirmation,
  TransportHandover,
} from '../../../../generated/prisma/client';

export interface PartnerApiPrincipal {
  clientId: string;
  partnerCode: string;
  partnerName: string;
  scopes: string[];
}

export type PartnerApiRequest = Request & {
  partner?: PartnerApiPrincipal;
  requestId?: string;
};

export interface ExternalWarehouseView {
  code: string;
  name: string;
  address: string | null;
  latitude?: string | null;
  longitude?: string | null;
  contact_name?: string | null;
  contact_phone?: string | null;
}

export interface ExternalHandoverListItem {
  handover_id: string;
  transport_code: string;
  container_code: string;
  container_type: string;
  status: string;
  ready_at: Date | null;
  expected_delivery_at: Date | null;
  warehouse: {
    code: string;
    name: string;
    address: string | null;
  };
}

export interface ExternalConfirmationItem {
  confirmation_id: string;
  confirmation_type: string;
  confirmed_at: Date;
  receiver_name?: string | null;
  condition?: string | null;
  note?: string | null;
}

export interface ExternalHandoverDetail {
  handover_id: string;
  transport_code: string;
  status: string;
  ready_at: Date | null;
  expected_delivery_at: Date | null;
  container: {
    container_code: string;
    container_type: string;
    seal: string | null;
    gross_weight: string | null;
    gate_out_at: Date | null;
  };
  warehouse: ExternalWarehouseView;
  consignee: {
    name: string | null;
  };
  confirmations: ExternalConfirmationItem[];
}

export type ExternalHandoverListRecord = TransportHandover & {
  containerVisit: {
    container: {
      containerNumber: string;
      type: string;
    };
  };
  warehouse: CustomerWarehouse;
};

export type ExternalHandoverDetailRecord = TransportHandover & {
  warehouse: CustomerWarehouse;
  containerVisit: {
    gateOutAt: Date | null;
    grossWeight: unknown;
    container: {
      containerNumber: string;
      type: string;
    };
    houseBl?: {
      consignee?: {
        name: string;
      } | null;
    } | null;
    reception?: {
      actualSeal?: string | null;
      actualWeight?: unknown;
    } | null;
  };
  confirmations: TransportConfirmation[];
};
