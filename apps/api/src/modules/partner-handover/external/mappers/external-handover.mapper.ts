import type { TransportConfirmation } from '../../../../generated/prisma/client';
import type {
  ExternalConfirmationItem,
  ExternalHandoverDetail,
  ExternalHandoverDetailRecord,
  ExternalHandoverListItem,
  ExternalHandoverListRecord,
} from '../types/partner-api.types';

export function mapExternalConfirmation(
  conf: TransportConfirmation,
): ExternalConfirmationItem {
  return {
    confirmation_id: conf.id,
    confirmation_type: conf.confirmationType,
    confirmed_at: conf.confirmedAt,
    receiver_name: conf.receiverName ?? null,
    condition: conf.condition ?? null,
    note: conf.note ?? null,
  };
}

export function mapExternalHandoverListItem(
  handover: ExternalHandoverListRecord,
): ExternalHandoverListItem {
  return {
    handover_id: handover.id,
    transport_code: handover.transportCode,
    container_code: handover.containerVisit.container.containerNumber,
    container_type: handover.containerVisit.container.type,
    status: handover.status,
    ready_at: handover.readyAt,
    expected_delivery_at: handover.expectedDeliveryAt,
    warehouse: {
      code: handover.warehouse.code,
      name: handover.warehouse.name,
      address: handover.warehouse.address,
    },
  };
}

export function mapExternalHandoverDetail(
  handover: ExternalHandoverDetailRecord,
): ExternalHandoverDetail {
  return {
    handover_id: handover.id,
    transport_code: handover.transportCode,
    status: handover.status,
    ready_at: handover.readyAt,
    expected_delivery_at: handover.expectedDeliveryAt,
    container: {
      container_code: handover.containerVisit.container.containerNumber,
      container_type: handover.containerVisit.container.type,
      seal: handover.containerVisit.reception?.actualSeal ?? null,
      gross_weight:
        handover.containerVisit.reception?.actualWeight?.toString() ??
        (handover.containerVisit.grossWeight != null
          ? String(handover.containerVisit.grossWeight)
          : null),
      gate_out_at: handover.containerVisit.gateOutAt,
    },
    warehouse: {
      code: handover.warehouse.code,
      name: handover.warehouse.name,
      address: handover.warehouse.address,
      latitude: handover.warehouse.latitude?.toString() ?? null,
      longitude: handover.warehouse.longitude?.toString() ?? null,
      contact_name: handover.warehouse.contactName,
      contact_phone: handover.warehouse.contactPhone,
    },
    consignee: {
      name: handover.containerVisit.houseBl?.consignee?.name ?? null,
    },
    confirmations: (handover.confirmations ?? []).map(mapExternalConfirmation),
  };
}
