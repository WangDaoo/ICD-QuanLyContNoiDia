import type {
  TariffContainerType,
  TariffServiceType,
  TariffServiceTypeCode,
} from './tariff.types';

export const REQUIRED_TARIFF_SERVICE_TYPES: TariffServiceTypeCode[] = [
  'RECEPTION',
  'STORAGE',
  'STRIPPING',
  'INSPECTION',
  'MOVEMENT',
];

export const DEFAULT_TARIFF_SERVICE_TYPES: TariffServiceType[] = [
  {
    code: 'RECEPTION',
    name: 'Reception',
    unit: 'container',
  },
  {
    code: 'STORAGE',
    name: 'Storage',
    unit: 'day',
  },
  {
    code: 'STRIPPING',
    name: 'Stripping',
    unit: 'container',
  },
  {
    code: 'INSPECTION',
    name: 'Inspection',
    unit: 'event',
  },
  {
    code: 'MOVEMENT',
    name: 'Movement',
    unit: 'event',
  },
];

export const TARIFF_CONTAINER_TYPES: TariffContainerType[] = [
  'ALL',
  '20GP',
  '40GP',
  '40HC',
];

export const TARIFF_CONTAINER_LABEL: Record<TariffContainerType, string> = {
  ALL: 'ALL · Generic',
  '20GP': '20GP',
  '40GP': '40GP',
  '40HC': '40HC',
};

export function getServiceTypeLabel(code: TariffServiceTypeCode): string {
  switch (code) {
    case 'RECEPTION':
      return 'Reception';
    case 'STORAGE':
      return 'Storage';
    case 'STRIPPING':
      return 'Stripping';
    case 'INSPECTION':
      return 'Inspection';
    case 'MOVEMENT':
      return 'Movement';
  }
}
