export const PERMISSION_CODES = {
  USERS_READ:
    'users.read',

  USERS_MANAGE:
    'users.manage',

  ROLES_READ:
    'roles.read',

  ROLES_MANAGE:
    'roles.manage',

  SETTINGS_READ:
    'settings.read',

  SETTINGS_MANAGE:
    'settings.manage',

  MANIFEST_READ:
    'manifest.read',

  MANIFEST_CREATE:
    'manifest.create',

  MANIFEST_SUBMIT:
    'manifest.submit',

  CONTAINER_READ:
    'container.read',

  GATE_IN_CREATE:
    'gate_in.create',

  YARD_READ:
    'yard.read',

  YARD_UPDATE:
    'yard.update',

  YARD_MOVE:
    'yard.move',

  YARD_INSPECT:
    'yard.inspect',

  BILLING_MANAGE:
    'billing.manage',

  GATE_PASS_CREATE:
    'gate_pass.create',

  GATE_PASS_USE:
    'gate_pass.use',

  REPORTS_READ:
    'reports.read',

  HANDOVER_CREATE:
    'handover.create',

  HANDOVER_READ:
    'handover.read',

  HANDOVER_CONFIRM:
    'handover.confirm',

  HANDOVER_DISPUTE:
    'handover.dispute',

  PARTNER_CLIENT_MANAGE:
    'partner_client.manage',

  PARTNER_API_LOG_READ:
    'partner_api_log.read',
} as const;

export type PermissionCode =
  (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];
