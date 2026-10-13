export const AUDIT_DATABASE = 'icd_ux_audit_20261003_e2e';
export const AUDIT_RUN = '2026-10-03-improvement-02';
export function assertAuditTarget(environment, actualDatabase) {
  const url = new URL(environment.DATABASE_URL);
  const validHost = ['127.0.0.1', 'localhost'].includes(environment.MYSQL_HOST);
  if (!validHost || url.hostname !== environment.MYSQL_HOST ||
      Number(url.port) !== Number(environment.MYSQL_PORT) ||
      url.pathname !== '/' + AUDIT_DATABASE || environment.MYSQL_DATABASE !== AUDIT_DATABASE ||
      environment.ICD_AUDIT_RUN !== AUDIT_RUN ||
      (actualDatabase !== undefined && actualDatabase !== AUDIT_DATABASE)) {
    throw new Error('Audit target guard rejected host, database, port or run mismatch.');
  }
}
