export type PartnerApiClientStatus =
  | 'ACTIVE'
  | 'REVOKED'
  | string;

export type PartnerApiScope =
  | 'handover.read'
  | 'handover.accept'
  | 'handover.transit'
  | 'handover.confirm_warehouse'
  | 'handover.failure'
  | string;

export type PartnerApiClient = {
  id: string;

  partnerCode: string;

  partnerName: string;

  description?: string | null;

  status: PartnerApiClientStatus;

  keyLast4?: string | null;

  scopes: string[];

  createdAt?: string | null;

  rotatedAt?: string | null;

  revokedAt?: string | null;

  lastRequestAt?: string | null;

  createdByName?: string | null;
};

export type CreatePartnerApiClientInput = {
  partnerCode: string;

  partnerName: string;

  description?: string;

  scopes: string[];
};

export type PartnerApiKeyReveal = {
  client: PartnerApiClient;

  apiKey: string;
};
