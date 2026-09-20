export type ReportTab =
  | 'overview'
  | 'gate-activity'
  | 'container-turnover'
  | 'yard-inventory'
  | 'revenue'
  | 'debt';

export type YardInventoryMode =
  | 'current'
  | 'eod';

export type ReportRangeFilter = {
  fromDate: string;
  toDate: string;
  timeZone?: string;
  groupBy?: 'DAY' | 'MONTH' | 'QUARTER';
};

export type ReportDashboardSummary = {
  asOfAt: string;
  timeZone: string;
  yard: {
    inYardCount: number;
    byCategory: Record<string, number>;
    byHoldStatus: Record<string, number>;
    byContainerType: Record<string, number>;
  };
  gateToday: {
    gateIn: number;
    gateOut: number;
    netFlow: number;
    hourly: Array<{
      hour: number;
      gateIn: number;
      gateOut: number;
    }>;
  };
  freeDayWarnings: {
    freeDaysLimit: number;
    totalWarnings: number;
    items: Array<{
      containerVisitId: string;
      containerNumber: string;
      consigneeName: string | null;
      gateInAt: string | null;
      dwellDays: number;
      freeDaysLimit: number;
      isOverdue: boolean;
      daysRemaining: number;
    }>;
  };
  revenueMonth: {
    period: string;
    totalRevenue: number;
    allocationCount: number;
    series: Array<{
      bucket: string;
      amount: number;
    }>;
  };
  outstandingDebt: {
    totalOutstanding: number;
    totalOverdue: number;
    invoiceCount: number;
  };
  operationalHolds: {
    activeCount: number;
  };
  ediAlerts: {
    activeAlertsCount: number;
    openCount: number;
    acknowledgedCount: number;
    bySeverity: Record<string, number>;
  };
};

export type GateActivityReport = {
  period: {
    fromDate: string;
    toDate: string;
    timeZone: string;
  };
  summary: {
    gateIn: number;
    gateOut: number;
    netFlow: number;
  };
  daily: Array<{
    date: string;
    gateIn: number;
    gateOut: number;
  }>;
  hourly: Array<{
    hour: number;
    gateIn: number;
    gateOut: number;
  }>;
};

export type ContainerTurnoverItem = {
  containerVisitId: string;
  containerNumber: string;
  containerType: string;
  consignee?: {
    id: string;
    name: string;
  } | null;
  gateInAt: string | null;
  gateOutAt: string | null;
  dwellHours: number;
  dwellDays: number;
};

export type ContainerTurnoverReport = {
  period: {
    fromDate: string;
    toDate: string;
    timeZone: string;
  };
  summary: {
    exitedCount: number;
    averageDwellHours: number;
    minimumDwellHours: number;
    maximumDwellHours: number;
  };
  byContainerType: Array<{
    containerType: string;
    count: number;
  }>;
  data: ContainerTurnoverItem[];
};

export type YardCurrentItem = {
  locationId: string;
  containerVisitId: string;
  containerNumber: string;
  containerType: string;
  state: string;
  consignee?: {
    id: string;
    name: string;
  } | null;
  blockCode: string;
  slotCode: string;
  rowNo: number;
  bayNo: number;
  tierNo: number;
  startedAt: string | null;
};

export type YardCurrentReport = {
  generatedAt: string;
  summary: {
    occupiedSlots: number;
    operationalSlots: number;
    availableSlots: number;
    occupancyRate: number;
  };
  byBlock: Array<{
    blockCode: string;
    count: number;
  }>;
  byContainerType: Array<{
    containerType: string;
    count: number;
  }>;
  data: YardCurrentItem[];
};

export type YardEodItem = {
  containerVisitId: string;
  containerNumber: string;
  containerType: string;
  blockCode: string;
  slotCode: string;
  locationStartedAt: string | null;
  locationEndedAt: string | null;
};

export type YardEodReport = {
  date: string;
  asOfAt: string;
  timeZone: string;
  isFinalized: boolean;
  total: number;
  byBlock: Array<{
    blockCode: string;
    count: number;
  }>;
  data: YardEodItem[];
};

export type RevenueReport = {
  period: {
    fromDate: string;
    toDate: string;
    timeZone: string;
    groupBy: string;
  };
  summary: {
    totalRevenue: number;
    allocationCount: number;
  };
  series: Array<{
    bucket: string;
    amount: number;
  }>;
  byConsignee: Array<{
    consigneeId: string;
    consigneeName: string;
    amount: number;
  }>;
  byMethod: Array<{
    method: string;
    amount: number;
  }>;
  byServiceType: Array<{
    serviceTypeId: string;
    serviceTypeName: string;
    amount: number;
  }>;
};

export type OutstandingDebtItem = {
  invoiceId: string;
  invoiceNo: string;
  consignee: {
    id: string;
    name: string;
    taxCode?: string | null;
  };
  issuedAt: string | null;
  dueAt: string | null;
  totalAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  isOverdue: boolean;
  daysOverdue: number;
};

export type OutstandingDebtReport = {
  asOfAt: string;
  summary: {
    invoiceCount: number;
    totalOutstanding: number;
    totalOverdue: number;
  };
  byConsignee: Array<{
    consigneeId: string;
    consigneeName: string;
    taxCode?: string | null;
    totalOutstanding: number;
    overdueAmount: number;
    invoiceCount: number;
  }>;
  data: OutstandingDebtItem[];
};
