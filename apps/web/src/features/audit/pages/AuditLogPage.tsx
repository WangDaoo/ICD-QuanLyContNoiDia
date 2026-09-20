import type { FormEvent } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';
import { auditLogApi } from '../api/audit-log.api';
import { AuditDiffDrawer } from '../components/AuditDiffDrawer';
import type {
  AuditLog,
  AuditLogPage as AuditLogPageType,
  AuditLogQuery,
} from '../audit-log.types';
import './AuditLog.css';

const DEFAULT_PAGE_SIZE = 25;

const EMPTY_PAGE: AuditLogPageType = {
  items: [],
  page: 1,
  pageSize: DEFAULT_PAGE_SIZE,
  total: 0,
  totalPages: 1,
};

function getErrorMessage(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'body' in error
  ) {
    const body = (
      error as {
        body?: {
          error?: {
            message?: string;
          };
          message?: string | string[];
        };
      }
    ).body;

    if (body?.error?.message) {
      return body.error.message;
    }

    if (typeof body?.message === 'string') {
      return body.message;
    }

    if (Array.isArray(body?.message)) {
      return body.message.join(', ');
    }
  }

  return error instanceof Error
    ? error.message
    : 'Không thể tải Audit Log.';
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString('vi-VN');
}

function actionTone(action: string): string {
  const normalized = action.toUpperCase();

  if (
    normalized.includes('CREATE') ||
    normalized.includes('ISSUE') ||
    normalized.includes('CONFIRM') ||
    normalized.includes('COMPLETE')
  ) {
    return 'success';
  }

  if (
    normalized.includes('DELETE') ||
    normalized.includes('REVOKE') ||
    normalized.includes('CANCEL') ||
    normalized.includes('DISPUTE')
  ) {
    return 'danger';
  }

  if (
    normalized.includes('UPDATE') ||
    normalized.includes('PATCH') ||
    normalized.includes('MOVE') ||
    normalized.includes('ASSIGN')
  ) {
    return 'primary';
  }

  return 'neutral';
}

function startOfDayIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}T00:00:00.000`).toISOString();
}

function endOfDayIso(value: string): string | undefined {
  if (!value) {
    return undefined;
  }
  return new Date(`${value}T23:59:59.999`).toISOString();
}

export function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [pageData, setPageData] = useState<AuditLogPageType>(EMPTY_PAGE);

  const [actorUserId, setActorUserId] = useState(
    searchParams.get('actorUserId') ?? '',
  );
  const [entityType, setEntityType] = useState(
    searchParams.get('entityType') ?? '',
  );
  const [requestId, setRequestId] = useState(
    searchParams.get('requestId') ?? '',
  );
  const [fromDate, setFromDate] = useState(
    searchParams.get('fromDate') ?? '',
  );
  const [toDate, setToDate] = useState(
    searchParams.get('toDate') ?? '',
  );

  const [query, setQuery] = useState<AuditLogQuery>({
    actorUserId: searchParams.get('actorUserId') || undefined,
    entityType: searchParams.get('entityType') || undefined,
    requestId: searchParams.get('requestId') || undefined,
    from: startOfDayIso(searchParams.get('fromDate') ?? ''),
    to: endOfDayIso(searchParams.get('toDate') ?? ''),
    page: Number(searchParams.get('page') ?? '1') || 1,
    pageSize: DEFAULT_PAGE_SIZE,
  });

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setPageData(await auditLogApi.list(query));
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  const entityTypes = useMemo(
    () =>
      Array.from(
        new Set(
          pageData.items
            .map((item) => item.entityType)
            .filter(Boolean),
        ),
      ).sort(),
    [pageData.items],
  );

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (fromDate && toDate && fromDate > toDate) {
      setError('Ngày bắt đầu không được sau ngày kết thúc.');
      return;
    }

    const next: AuditLogQuery = {
      actorUserId: actorUserId.trim() || undefined,
      entityType: entityType || undefined,
      requestId: requestId.trim() || undefined,
      from: startOfDayIso(fromDate),
      to: endOfDayIso(toDate),
      page: 1,
      pageSize: query.pageSize,
    };

    setQuery(next);

    const params = new URLSearchParams();
    if (next.actorUserId) {
      params.set('actorUserId', next.actorUserId);
    }
    if (next.entityType) {
      params.set('entityType', next.entityType);
    }
    if (next.requestId) {
      params.set('requestId', next.requestId);
    }
    if (fromDate) {
      params.set('fromDate', fromDate);
    }
    if (toDate) {
      params.set('toDate', toDate);
    }

    setSearchParams(params, { replace: true });
  }

  function clearFilters() {
    setActorUserId('');
    setEntityType('');
    setRequestId('');
    setFromDate('');
    setToDate('');

    setQuery({
      page: 1,
      pageSize: query.pageSize,
    });

    setSearchParams({}, { replace: true });
  }

  function filterRequestId(value: string) {
    setRequestId(value);
    setQuery((current) => ({
      ...current,
      requestId: value,
      page: 1,
    }));

    const params = new URLSearchParams(searchParams);
    params.set('requestId', value);
    params.delete('page');

    setSearchParams(params, { replace: true });
  }

  function changePage(page: number) {
    setQuery((current) => ({
      ...current,
      page,
    }));

    const params = new URLSearchParams(searchParams);
    if (page <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }

    setSearchParams(params, { replace: true });
  }

  return (
    <div className="audit-page">
      <div className="audit-toolbar">
        <div>
          <span>GOVERNANCE · TRACEABILITY</span>
          <h2>Audit Logs</h2>
          <p>
            Theo dõi actor, action, entity, request correlation và before/after của
            các thay đổi trong ICD.
          </p>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={() => {
            void load();
          }}
        >
          ↻ Làm mới
        </button>
      </div>

      {error && (
        <div className="audit-message audit-message--error">
          <strong>!</strong> {error}
        </div>
      )}

      <section className="audit-summary">
        <article>
          <span>TOTAL LOGS</span>
          <strong>{pageData.total}</strong>
        </article>

        <article>
          <span>PAGE</span>
          <strong>
            {pageData.page} / {pageData.totalPages}
          </strong>
        </article>

        <article>
          <span>PAGE SIZE</span>
          <strong>{pageData.pageSize}</strong>
        </article>

        <article>
          <span>MODE</span>
          <strong className="audit-readonly">READ ONLY</strong>
        </article>
      </section>

      <form className="audit-filters" onSubmit={applyFilters}>
        <label>
          <span>Actor User ID</span>
          <input
            value={actorUserId}
            placeholder="UUID user"
            onChange={(event) => setActorUserId(event.target.value)}
          />
        </label>

        <label>
          <span>Entity Type</span>
          <input
            list="audit-entity-types"
            value={entityType}
            placeholder="CONTAINER_VISIT..."
            onChange={(event) => setEntityType(event.target.value)}
          />
          <datalist id="audit-entity-types">
            {entityTypes.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </label>

        <label>
          <span>Request ID</span>
          <input
            value={requestId}
            placeholder="Exact X-Request-Id"
            onChange={(event) => setRequestId(event.target.value)}
          />
        </label>

        <label>
          <span>Từ ngày</span>
          <input
            type="date"
            value={fromDate}
            onChange={(event) => setFromDate(event.target.value)}
          />
        </label>

        <label>
          <span>Đến ngày</span>
          <input
            type="date"
            value={toDate}
            onChange={(event) => setToDate(event.target.value)}
          />
        </label>

        <div className="audit-filter-actions">
          <button type="button" onClick={clearFilters}>
            Xóa lọc
          </button>
          <button type="submit" className="audit-primary-button">
            Áp dụng
          </button>
        </div>
      </form>

      <section className="audit-panel">
        <div className="audit-panel__heading">
          <div>
            <span>AUDIT TRAIL</span>
            <strong>{pageData.total} records</strong>
          </div>
          <small>Mới nhất trước</small>
        </div>

        <div className="audit-table-wrapper">
          <table className="audit-table">
            <thead>
              <tr>
                <th>THỜI GIAN</th>
                <th>ACTOR</th>
                <th>ACTION</th>
                <th>ENTITY</th>
                <th>ICD</th>
                <th>REQUEST ID</th>
                <th>REASON</th>
                <th />
              </tr>
            </thead>

            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <tr key={index} className="audit-skeleton-row">
                    {Array.from({ length: 8 }).map((__, cellIndex) => (
                      <td key={cellIndex}>
                        <span />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                pageData.items.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <strong>{formatDateTime(log.createdAt)}</strong>
                    </td>

                    <td>
                      <strong>{log.actorName ?? 'SYSTEM'}</strong>
                      <small>
                        {log.actorEmail ?? log.actorUserId ?? '—'}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`audit-action audit-action--${actionTone(
                          log.action,
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td>
                      <strong className="audit-mono">{log.entityType}</strong>
                      <small className="audit-mono">{log.entityId ?? '—'}</small>
                    </td>

                    <td>{log.icdName ?? log.icdCode ?? '—'}</td>

                    <td>
                      {log.requestId ? (
                        <button
                          type="button"
                          className="audit-request-link"
                          title="Lọc exact theo Request ID này"
                          onClick={() => filterRequestId(log.requestId!)}
                        >
                          {log.requestId}
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td>
                      <span className="audit-reason-cell">
                        {log.reason ?? '—'}
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="audit-detail-button"
                        onClick={() => setSelectedLog(log)}
                      >
                        Xem diff
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {!loading && pageData.items.length === 0 && (
            <div className="audit-empty">
              Không có Audit Log phù hợp bộ lọc.
            </div>
          )}
        </div>

        <div className="audit-pagination">
          <span>
            {pageData.total === 0
              ? '0 records'
              : `${(pageData.page - 1) * pageData.pageSize + 1}-${Math.min(
                  pageData.page * pageData.pageSize,
                  pageData.total,
                )} / ${pageData.total}`}
          </span>

          <div>
            <button
              type="button"
              disabled={loading || pageData.page <= 1}
              onClick={() => changePage(pageData.page - 1)}
            >
              ← Trước
            </button>

            <strong>{pageData.page}</strong>

            <button
              type="button"
              disabled={loading || pageData.page >= pageData.totalPages}
              onClick={() => changePage(pageData.page + 1)}
            >
              Sau →
            </button>
          </div>
        </div>
      </section>

      <section className="audit-correlation-note">
        <div>
          <strong>Request correlation</strong>
          <span>
            `requestId` có thể đối chiếu với `X-Request-Id`, error response/server
            log và Partner API Log khi xử lý integration.
          </span>
        </div>

        <div>
          <strong>Immutable history</strong>
          <span>
            Màn Audit chỉ đọc. Không có update, delete hoặc replay action từ đây.
          </span>
        </div>
      </section>

      {selectedLog && (
        <AuditDiffDrawer
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}

export default AuditLogPage;
