export type TruckVisitStatus =
  | 'SCHEDULED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | string;

export type TruckVisitContainer = {
  visitId: string;

  containerNumber: string;

  status?: string | null;

  size?: string | null;
  type?: string | null;
  isoCode?: string | null;
};

export type TruckVisit = {
  id: string;

  visitNumber?: string | null;

  status: TruckVisitStatus;

  vehiclePlate: string;

  trailerPlate?: string | null;

  driverName: string;

  transporterId?: string | null;
  transporterName?: string | null;

  appointmentAt?: string | null;

  gateLane?: string | null;

  arrivedAt?: string | null;

  completedAt?: string | null;

  cancelledAt?: string | null;

  containers: TruckVisitContainer[];

  createdAt?: string | null;

  updatedAt?: string | null;
};

export type CreateTruckVisitInput = {
  vehiclePlate: string;

  driverName: string;

  transporterId?: string;

  appointmentAt?: string;

  gateLane?: string;

  containerVisitIds: string[];
};
