export type GateHourlyPoint = {
  hour: number;
  gateIn: number;
  gateOut: number;
};

export type DashboardSummary = {
  yard: {
    currentInventory: number;
    capacity: number;
    occupancyRate: number;
  };

  gateToday: {
    gateIn: number;
    gateOut: number;
    netFlow: number;
    hourly: GateHourlyPoint[];
  };

  revenueMonth: {
    amount: number;
    invoiceCount: number;
  };

  outstandingDebt: {
    amount: number;
    invoiceCount: number;
  };

  operationalHolds: {
    activeCount: number;
  };

  ediAlerts: {
    openCount: number;
  };
};
