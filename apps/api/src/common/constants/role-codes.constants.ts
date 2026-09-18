export const ROLE_CODES = {
  ADMIN: 'ADMIN',

  MANAGER: 'MANAGER',

  OPERATOR: 'OPERATOR',

  GATE_STAFF: 'GATE_STAFF',

  YARD_STAFF: 'YARD_STAFF',

  AGENT: 'AGENT',

  CONSIGNEE: 'CONSIGNEE',
} as const;

export type RoleCode =
  (typeof ROLE_CODES)[keyof typeof ROLE_CODES];
