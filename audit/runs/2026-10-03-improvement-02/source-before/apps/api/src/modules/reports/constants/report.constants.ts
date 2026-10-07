export const DEFAULT_REPORT_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const REPORT_GROUP_BY = {
  DAY: 'DAY',
  MONTH: 'MONTH',
  QUARTER: 'QUARTER',
} as const;

export type ReportGroupBy = (typeof REPORT_GROUP_BY)[keyof typeof REPORT_GROUP_BY];

export const REPORT_EXCEL_SHEETS = {
  SUMMARY: 'Summary',
  GATE_ACTIVITY: 'Gate Activity',
  CONTAINER_TURNOVER: 'Container Turnover',
  YARD_INVENTORY: 'Yard Inventory',
  YARD_EOD: 'Yard EOD',
  REVENUE: 'Revenue',
  OUTSTANDING_DEBT: 'Outstanding Debt',
} as const;
