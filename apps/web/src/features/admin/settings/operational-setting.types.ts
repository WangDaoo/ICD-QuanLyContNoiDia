export type OperationalSettingKey =
  | 'FREE_STORAGE_DAYS'
  | 'GATE_PASS_TTL_HOURS'
  | 'GATE_IN_SLA_MINUTES'
  | 'YARD_ASSIGN_SLA_MINUTES'
  | 'OVERDUE_DEBT_DAYS';

export type OperationalSettingUnit =
  | 'day'
  | 'hour'
  | 'minute';

export type OperationalSetting = {
  key: OperationalSettingKey;
  value: number;
  description?: string | null;
  updatedAt?: string | null;
  updatedByName?: string | null;
};

export type OperationalSettingDefinition = {
  key: OperationalSettingKey;
  label: string;
  description: string;
  unit: OperationalSettingUnit;
  defaultValue: number;
};

export type UpdateOperationalSettingInput = {
  value: number;
};
