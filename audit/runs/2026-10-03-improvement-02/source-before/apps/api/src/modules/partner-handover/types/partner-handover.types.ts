import {
  PartnerApiClientStatus,
  TransportHandoverStatus,
  TransportConfirmationType,
} from '../../../generated/prisma/client';

export {
  PartnerApiClientStatus,
  TransportHandoverStatus,
  TransportConfirmationType,
};

export interface PartnerClientCreateResult {
  client: {
    id: string;
    partnerCode: string;
    partnerName: string;
    keyLast4: string | null;
    status: PartnerApiClientStatus;
    scopes: string[];
    createdAt: Date;
  };
  rawApiKey: string;
}

export interface PartnerClientRotateResult {
  client: {
    id: string;
    partnerCode: string;
    partnerName: string;
    keyLast4: string | null;
    status: PartnerApiClientStatus;
    scopes: string[];
    rotatedAt: Date | null;
  };
  rawApiKey: string;
}
