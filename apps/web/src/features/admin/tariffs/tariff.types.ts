export type TariffStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'RETIRED'
  | string;

export type TariffServiceTypeCode =
  | 'RECEPTION'
  | 'STORAGE'
  | 'STRIPPING'
  | 'INSPECTION'
  | 'MOVEMENT';

export type TariffContainerType =
  | 'ALL'
  | '20GP'
  | '40GP'
  | '40HC';

export type TariffServiceType = {
  id?: string | null;
  code: TariffServiceTypeCode;
  name: string;
  unit?: string | null;
};

export type TariffRule = {
  id?: string | null;
  serviceTypeId?: string | null;
  serviceTypeCode: TariffServiceTypeCode;
  serviceTypeName?: string | null;
  unit?: string | null;
  containerType: TariffContainerType;
  unitPrice: number;
  freeDays?: number | null;
  minQuantity?: number | null;
  maxQuantity?: number | null;
};

export type Tariff = {
  id: string;
  name: string;
  status: TariffStatus;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  createdAt?: string | null;
  createdByName?: string | null;
  rules: TariffRule[];
};

export type TariffSnapshot = {
  tariffs: Tariff[];
  serviceTypes: TariffServiceType[];
};

export type CreateTariffRuleInput = {
  serviceTypeId?: string;
  serviceTypeCode: TariffServiceTypeCode;
  containerType: TariffContainerType;
  unitPrice: number;
  freeDays?: number;
  minQuantity?: number;
  maxQuantity?: number;
};

export type CreateTariffInput = {
  name: string;
  effectiveFrom: string;
  effectiveTo?: string;
  rules: CreateTariffRuleInput[];
};

export type TariffActivationReadiness = {
  ready: boolean;
  missingServiceTypes: TariffServiceTypeCode[];
};
