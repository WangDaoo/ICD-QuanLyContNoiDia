import { EdiRoutingSnapshot } from '../schemas/edi-routing-snapshot.schema';

export interface EdiDeliveryInput {
  messageId: string;

  messageType: string;

  idempotencyKey: string;

  requestId: string | null;

  payload: unknown;

  routing: EdiRoutingSnapshot;
}

export interface EdiDeliveryResult {
  externalReference: string | null;
}

export interface EdiTransportClient {
  deliver(input: EdiDeliveryInput): Promise<EdiDeliveryResult>;
}
