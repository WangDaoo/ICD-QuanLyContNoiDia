export const PERMISSION_CODES = {
  USERS_READ: 'users.read',

  USERS_MANAGE: 'users.manage',

  ROLES_READ: 'roles.read',

  ROLES_MANAGE: 'roles.manage',

  SETTINGS_READ: 'settings.read',

  SETTINGS_MANAGE: 'settings.manage',

  MASTER_DATA_READ: 'master_data.read',

  MASTER_DATA_MANAGE: 'master_data.manage',

  MANIFEST_READ: 'manifest.read',

  MANIFEST_CREATE: 'manifest.create',

  MANIFEST_UPDATE: 'manifest.update',

  MANIFEST_SUBMIT: 'manifest.submit',

  MANIFEST_CANCEL: 'manifest.cancel',

  CONTAINER_READ: 'container.read',

  CONTAINER_CREATE: 'container.create',

  CONTAINER_UPDATE: 'container.update',

  CONTAINER_CANCEL: 'container.cancel',

  MOVEMENT_ORDER_READ: 'movement_order.read',

  MOVEMENT_ORDER_CREATE: 'movement_order.create',

  MOVEMENT_ORDER_UPDATE: 'movement_order.update',

  MOVEMENT_ORDER_AUTHORIZE: 'movement_order.authorize',

  MOVEMENT_ORDER_CANCEL: 'movement_order.cancel',

  TRUCK_VISIT_READ: 'truck_visit.read',

  TRUCK_VISIT_CREATE: 'truck_visit.create',

  TRUCK_VISIT_UPDATE: 'truck_visit.update',

  TRUCK_VISIT_ARRIVE: 'truck_visit.arrive',

  TRUCK_VISIT_CANCEL: 'truck_visit.cancel',

  GATE_IN_CREATE: 'gate_in.create',

  YARD_READ: 'yard.read',

  YARD_UPDATE: 'yard.update',

  YARD_CONFIGURE: 'yard.configure',

  YARD_MOVE: 'yard.move',

  YARD_INSPECT: 'yard.inspect',

  YARD_BOOKING: 'yard.booking',

  BILLING_READ: 'billing.read',

  BILLING_MANAGE: 'billing.manage',

  TARIFF_MANAGE: 'tariff.manage',

  OPERATIONAL_HOLD_READ: 'operational_hold.read',

  OPERATIONAL_HOLD_MANAGE: 'operational_hold.manage',

  GATE_PASS_CREATE: 'gate_pass.create',

  GATE_PASS_USE: 'gate_pass.use',

  REPORTS_READ: 'reports.read',

  HANDOVER_CREATE: 'handover.create',

  HANDOVER_READ: 'handover.read',

  HANDOVER_CONFIRM: 'handover.confirm',

  HANDOVER_DISPUTE: 'handover.dispute',

  PARTNER_CLIENT_MANAGE: 'partner_client.manage',

  PARTNER_API_LOG_READ: 'partner_api_log.read',

  AUDIT_READ: 'audit.read',

  EDI_READ: 'edi.read',

  EDI_MANAGE: 'edi.manage',

  EDI_DISPATCH: 'edi.dispatch',

  EDI_ACK_INGEST: 'edi.ack.ingest',

  EDI_ALERT_MANAGE: 'edi.alert.manage',

  NOTIFICATION_READ: 'notification.read',

  NOTIFICATION_MANAGE: 'notification.manage',
} as const;

export type PermissionCode = (typeof PERMISSION_CODES)[keyof typeof PERMISSION_CODES];

