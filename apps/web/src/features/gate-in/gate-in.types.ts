export type GateInCondition =
  | 'GOOD'
  | 'DAMAGED'
  | 'DIRTY'
  | 'SEAL_BROKEN';

export type GateInTruckVisit = {
  id: string;

  visitNumber?: string | null;

  status: string;

  vehiclePlate?: string | null;

  trailerPlate?: string | null;

  driverName?: string | null;

  transporterId?: string | null;

  transporterName?: string | null;

  gateLane?: string | null;
};

export type GateInContext = {
  visitId: string;

  containerId?: string | null;

  containerNumber: string;

  visitStatus: string;

  size?: string | null;

  type?: string | null;

  isoCode?: string | null;

  expectedSeal?: string | null;

  grossWeight?: number | null;

  movementOrder?: {
    id?: string | null;
    status?: string | null;
    expiresAt?: string | null;
  } | null;

  currentTruckVisit?: GateInTruckVisit | null;

  availableTruckVisits: GateInTruckVisit[];
};

export type GateInRequest = {
  actualSeal: string;

  actualWeight?: number;

  condition?: GateInCondition;

  notes?: string;

  truckVisitId?: string;

  vehiclePlate?: string;

  driverName?: string;

  transporterId?: string;
};

export type GateInResult = {
  visitId: string;

  containerNumber?: string | null;

  status: string;

  receptionId?: string | null;

  gateInAt?: string | null;

  sealMismatch?: boolean;
};
