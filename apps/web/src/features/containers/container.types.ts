export type ContainerVisitStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'IN_YARD'
  | 'GATE_PASS_ISSUED'
  | 'EXITED'
  | 'CANCELLED'
  | string;

export type ContainerListItem = {
  id: string;
  visitId: string;

  containerNumber: string;

  size?: string;
  type?: string;
  isoCode?: string;

  status: ContainerVisitStatus;

  yardPosition?: string | null;

  consigneeName?: string | null;

  hblNumber?: string | null;
  mblNumber?: string | null;

  gateInAt?: string | null;
  gateOutAt?: string | null;

  createdAt?: string | null;
};

export type ContainerDetail = {
  id: string;
  visitId: string;

  containerNumber: string;

  size?: string;
  type?: string;
  isoCode?: string;

  sealNumber?: string | null;
  grossWeight?: number | null;

  status: ContainerVisitStatus;

  manifest?: {
    id?: string;
    manifestNumber?: string | null;
    vesselName?: string | null;
    voyageNumber?: string | null;
  } | null;

  masterBl?: {
    id?: string;
    number?: string | null;
  } | null;

  houseBl?: {
    id?: string;
    number?: string | null;
  } | null;

  consignee?: {
    id?: string;
    name?: string | null;
  } | null;

  clearingAgent?: {
    id?: string;
    name?: string | null;
  } | null;

  truckVisit?: {
    id?: string;
    vehiclePlate?: string | null;
    trailerPlate?: string | null;
    driverName?: string | null;
    status?: string | null;
  } | null;

  yardPosition?: {
    id?: string;
    slotId?: string;
    block?: string | null;
    row?: string | null;
    bay?: string | null;
    tier?: string | null;
    label?: string | null;
    startedAt?: string | null;
  } | null;

  gateInAt?: string | null;
  gateOutAt?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type ContainerTimelineEvent = {
  id: string;

  type: string;

  title: string;

  description?: string | null;

  createdAt: string;

  actorName?: string | null;

  metadata?: Record<string, unknown>;
};
