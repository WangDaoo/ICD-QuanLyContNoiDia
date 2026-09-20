export type YardSlotStatus =
  | 'AVAILABLE'
  | 'OCCUPIED'
  | 'MAINTENANCE'
  | 'BLOCKED'
  | string;

export type YardSlot = {
  id: string;

  block: string;
  row: string;
  bay: string;
  tier: string;

  label: string;

  type?: string | null;

  status: YardSlotStatus;

  isOperational: boolean;

  reeferPower: boolean;

  maxWeight?: number | null;

  supportedSizes?: string[];

  currentContainer?: {
    visitId?: string | null;
    containerNumber?: string | null;
  } | null;
};

export type YardRecommendation = {
  id?: string;

  slotId: string;

  rank: number;

  score: number;

  reasons: string[];

  source?: 'RULE' | 'ML' | 'HYBRID' | string;

  slot: YardSlot;
};

export type YardAssignmentResult = {
  visitId: string;

  slotId: string;

  position?: string | null;

  assignedAt?: string | null;
};

export type YardCandidateContainer = {
  visitId: string;

  containerNumber: string;

  size?: string | null;
  type?: string | null;
  isoCode?: string | null;

  grossWeight?: number | null;

  yardPosition?: string | null;
};
