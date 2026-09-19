export const CONTAINER_TYPES = [
  '20GP',
  '40GP',
  '40HC',
  '20RF',
  '40RF',
  '45HC',
  '20OT',
  '40OT',
  '20FR',
  '40FR',
  '20TK',
  '40TK',
  'DRY',
  'REEFER',
  'FLATRACK',
  'OPENTOP',
  'TANK',
] as const;

export type ContainerType = (typeof CONTAINER_TYPES)[number] | string;
