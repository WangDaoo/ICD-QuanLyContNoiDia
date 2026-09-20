import {
  getChangedFields,
  stringifyAuditValue,
} from '../utils/audit-redaction';
import type { AuditLog } from '../audit-log.types';

type AuditDiffDrawerProps = {
  log: AuditLog;
  onClose: () => void;
};

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('vi-VN');
}

export function AuditDiffDrawer({
  log,
  onClose,
}: AuditDiffDrawerProps) {
  const changedFields = getChangedFields(
    log.oldData,
    log.newData,
  );

  return (
    <div
      className="audit-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <aside
        className="audit-drawer"
        role="dialog"
        aria-modal="true"
      >
        <div className="audit-drawer__heading">
          <div>
            <span>AUDIT DETAIL</span>
            <h3>{log.action}</h3>
            <p>{formatDateTime(log.createdAt)}</p>
          </div>

          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <section className="audit-detail-grid">
          <div>
            <span>Actor</span>
            <strong>
              {log.actorName ?? log.actorEmail ?? 'SYSTEM'}
            </strong>
            <small>{log.actorUserId ?? '—'}</small>
          </div>

          <div>
            <span>Entity</span>
            <strong>{log.entityType}</strong>
            <small>{log.entityId ?? '—'}</small>
          </div>

          <div>
            <span>ICD</span>
            <strong>{log.icdName ?? log.icdCode ?? '—'}</strong>
            <small>{log.icdId ?? '—'}</small>
          </div>

          <div>
            <span>Request ID</span>
            <strong className="audit-mono">
              {log.requestId ?? '—'}
            </strong>
          </div>
        </section>

        {log.reason && (
          <section className="audit-reason">
            <span>REASON</span>
            <p>{log.reason}</p>
          </section>
        )}

        {changedFields.length > 0 && (
          <section className="audit-changed-fields">
            <span>CHANGED FIELDS</span>
            <div>
              {changedFields.map((field) => (
                <code key={field}>{field}</code>
              ))}
            </div>
          </section>
        )}

        <section className="audit-diff">
          <article>
            <div className="audit-diff__title audit-diff__title--before">
              <span>BEFORE</span>
              <strong>Old Data</strong>
            </div>

            <pre>{stringifyAuditValue(log.oldData)}</pre>
          </article>

          <article>
            <div className="audit-diff__title audit-diff__title--after">
              <span>AFTER</span>
              <strong>New Data</strong>
            </div>

            <pre>{stringifyAuditValue(log.newData)}</pre>
          </article>
        </section>

        <section className="audit-security-note">
          <strong>Redacted view</strong>
          <p>
            Password, token, credential, authorization, secret và API Key không được
            hiển thị plaintext trong Audit UI.
          </p>
        </section>
      </aside>
    </div>
  );
}
