export type MovementOrderStatus =
  | 'DRAFT'
  | 'AUTHORIZED'
  | 'EXPIRED'
  | 'CANCELLED'
  | string;

export type MovementOrder = {
  id: string;
  visitId?: string | null;

  status: MovementOrderStatus;

  expiresAt?: string | null;
  authorizedAt?: string | null;

  createdAt?: string | null;
  updatedAt?: string | null;
};

export type MovementOrderWorkspaceItem = {
  visitId: string;

  containerNumber: string;

  containerStatus: string;

  size?: string;
  type?: string;
  isoCode?: string;

  consigneeName?: string | null;

  hblNumber?: string | null;
  mblNumber?: string | null;

  createdAt?: string | null;
};
