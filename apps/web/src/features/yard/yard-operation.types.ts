export type YardOperationStatus =
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | string;

export type InspectionResult =
  | 'PASS'
  | 'FAIL'
  | 'HOLD';

export type YardBookingType =
  | 'STRIPPING'
  | 'STUFFING'
  | 'INSPECTION';

export type YardOperationSlot = {
  id?: string | null;
  label?: string | null;
};

export type YardMovement = {
  operationType: 'MOVEMENT';

  id: string;

  status: YardOperationStatus;

  fromSlot?: YardOperationSlot | null;

  toSlot?: YardOperationSlot | null;

  reason?: string | null;

  notes?: string | null;

  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type YardInspection = {
  operationType: 'INSPECTION';

  id: string;

  status: YardOperationStatus;

  inspectionType?: string | null;

  result?: InspectionResult | null;

  notes?: string | null;

  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type YardBooking = {
  operationType: 'BOOKING';

  id: string;

  status: YardOperationStatus;

  bookingType: YardBookingType | string;

  scheduledAt?: string | null;

  notes?: string | null;

  createdAt?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type YardOperation =
  | YardMovement
  | YardInspection
  | YardBooking;

export type YardOperationsSnapshot = {
  movements: YardMovement[];

  inspections: YardInspection[];

  bookings: YardBooking[];

  operations: YardOperation[];
};

export type CreateYardMovementInput = {
  targetSlotId: string;

  notes?: string;
};

export type CompleteYardMovementInput = {
  notes?: string;
};

export type CreateInspectionInput = {
  inspectionType: string;

  notes?: string;
};

export type CompleteInspectionInput = {
  result: InspectionResult;

  notes?: string;
};

export type CreateYardBookingInput = {
  bookingType: YardBookingType;

  scheduledAt: string;

  notes?: string;
};
