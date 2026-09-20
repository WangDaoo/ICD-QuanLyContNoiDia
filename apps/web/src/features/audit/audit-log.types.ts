export type AuditActor = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
};

export type AuditIcd = {
  id?: string | null;
  code?: string | null;
  name?: string | null;
};

export type AuditLog = {
  id: string;
  actorUserId?: string | null;
  actorName?: string | null;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  oldData?: unknown;
  newData?: unknown;
  reason?: string | null;
  requestId?: string | null;
  icdId?: string | null;
  icdCode?: string | null;
  icdName?: string | null;
  createdAt: string;
};

export type AuditLogQuery = {
  actorUserId?: string;
  entityType?: string;
  requestId?: string;
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
};

export type AuditLogPage = {
  items: AuditLog[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};
