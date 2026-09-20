import { apiClient } from '../../../services/api/api-client';

export type GateInContext = {
  containerVisit: {
    id: string;
    state: string;
    expectedSeal?: string | null;
    grossWeight?: string | null;
    gateInAt?: string | null;
    container: {
      id: string;
      containerNumber: string;
      isoCode: string;
      size: string;
      type: string;
    };
    houseBl?: {
      id: string;
      houseBlNo?: string;
      consignee?: {
        name?: string;
      };
    } | null;
  };
  movementOrder?: {
    id: string;
    status: string;
    expiresAt?: string | null;
    authorizedAt?: string | null;
  } | null;
  eligibleTruckVisits: Array<{
    id: string;
    truckPlate?: string;
    vehiclePlate?: string;
    trailerPlate?: string | null;
    driverName?: string;
    gateLane?: string | null;
    status?: string;
    sequenceNo?: number;
    transporter?: {
      name?: string;
    };
  }>;
  alreadyReceived: boolean;
  reception?: {
    id: string;
    actualSeal: string;
    actualWeight?: string | null;
    conditionCode?: string | null;
    conditionNotes?: string | null;
    receivedAt: string;
  } | null;
};

export type CreateGateInInput = {
  truckVisitId: string;
  actualSeal: string;
  actualWeight?: number;
  conditionCode?: string;
  conditionNotes?: string;
  photoRef?: string;
};

export type GateInConfirmResponse = {
  reception: {
    id: string;
    containerVisitId: string;
    truckVisitId: string;
    actualSeal: string;
    actualWeight?: number | null;
    conditionCode?: string | null;
    conditionNotes?: string | null;
    receivedAt: string;
  };
  sealComparison: 'MATCH' | 'MISMATCH' | 'NOT_APPLICABLE';
  nextAction: string;
};

export function unwrapData<T>(value: T | { data: T }): T {
  if (typeof value === 'object' && value !== null && 'data' in value) {
    return (value as { data: T }).data;
  }
  return value as T;
}

const CONTAINER_PATTERN = /\b[A-Z]{4}\d{7}\b/;

export function extractContainerNumber(value: string): string | null {
  const normalized = value.toUpperCase();
  const match = normalized.match(CONTAINER_PATTERN);
  return match?.[0] ?? null;
}

export const gateInApi = {
  getContext(visitId: string): Promise<GateInContext | { data: GateInContext }> {
    return apiClient.get(`/containers/${visitId}/gate-in-context`);
  },

  confirm(
    visitId: string,
    input: CreateGateInInput,
  ): Promise<GateInConfirmResponse | { data: GateInConfirmResponse }> {
    return apiClient.post(`/containers/${visitId}/gate-in`, input);
  },

  searchContainerVisits(search: string): Promise<unknown> {
    return apiClient.get(`/containers?search=${encodeURIComponent(search)}&limit=10`);
  },
};
