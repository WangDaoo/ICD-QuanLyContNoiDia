import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  partnerApiLogApi,
} from '../api/partner-api-log.api';

import type {
  PartnerApiLog,
} from '../partner-api-log.types';

import '../../partner-gateway/PartnerGatewayAdmin.css';

function formatDateTime(
  value?: string | null,
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? '—'
    : date.toLocaleString(
        'vi-VN',
      );
}

function prettyJson(
  value: unknown,
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return '—';
  }

  try {
    return JSON.stringify(
      value,
      null,
      2,
    );
  } catch {
    return String(value);
  }
}

export function PartnerApiLogDetailPage() {
  const params =
    useParams<{
      logId: string;
    }>();

  const navigate =
    useNavigate();

  const logId =
    params.logId;

  const [
    log,
    setLog,
  ] =
    useState<
      PartnerApiLog | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const load =
    useCallback(
      async () => {
        if (!logId) {
          return;
        }

        try {
          setLoading(true);
          setError(null);

          setLog(
            await partnerApiLogApi.getById(
              logId,
            ),
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Không thể tải chi tiết Partner API Log.',
          );
        } finally {
          setLoading(false);
        }
      },
      [logId],
    );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="partner-admin-state">
        <div className="partner-admin-spinner" />
      </div>
    );
  }

  if (!log) {
    return (
      <div className="partner-admin-state">
        <strong>
          Không tìm thấy Partner API Log
        </strong>

        <span>
          {error}
        </span>
      </div>
    );
  }

  return (
    <div className="partner-admin-page">
      <div className="partner-admin-detail-toolbar">
        <button
          type="button"
          onClick={() =>
            navigate(
              '/admin/partner-api-logs',
            )
          }
        >
          ← Partner API Logs
        </button>

        <span className="partner-admin-badge">
          LOG DETAIL
        </span>
      </div>

      <section className="partner-log-hero">
        <div>
          <span>
            {log.method} · HTTP{' '}
            {log.httpStatus}
          </span>

          <h2>
            {log.endpoint}
          </h2>

          <p>
            Request ID:{' '}
            <code>
              {log.requestId ??
                '—'}
            </code>
          </p>
        </div>

        <div>
          <span>
            LATENCY
          </span>

          <strong>
            {log.latencyMs !==
              null &&
            log.latencyMs !==
              undefined
              ? `${log.latencyMs} ms`
              : '—'}
          </strong>
        </div>
      </section>

      <div className="partner-log-sections">
        <section className="partner-admin-panel partner-admin-card">
          <h3>
            Metadata
          </h3>

          <dl>
            <div>
              <dt>
                Partner
              </dt>

              <dd>
                {log.partnerName ??
                  log.partnerCode ??
                  '—'}
              </dd>
            </div>

            <div>
              <dt>
                Transport / Handover
              </dt>

              <dd>
                {log.transportCode ??
                  '—'}
              </dd>
            </div>

            <div>
              <dt>
                Container
              </dt>

              <dd>
                {log.containerNumber ??
                  '—'}
              </dd>
            </div>

            <div>
              <dt>
                Business status
              </dt>

              <dd>
                {log.businessStatus ??
                  '—'}
              </dd>
            </div>

            <div>
              <dt>
                Error code
              </dt>

              <dd>
                {log.errorCode ??
                  '—'}
              </dd>
            </div>

            <div>
              <dt>
                State transition
              </dt>

              <dd>
                {log.stateBefore ??
                  '—'}{' '}
                →{' '}
                {log.stateAfter ??
                  '—'}
              </dd>
            </div>

            <div>
              <dt>
                Idempotency key
              </dt>

              <dd>
                <code>
                  {log.idempotencyKeyMasked ??
                    '—'}
                </code>
              </dd>
            </div>

            <div>
              <dt>
                Request hash
              </dt>

              <dd>
                <code>
                  {log.requestHash ??
                    '—'}
                </code>
              </dd>
            </div>

            <div>
              <dt>
                Started
              </dt>

              <dd>
                {formatDateTime(
                  log.createdAt,
                )}
              </dd>
            </div>

            <div>
              <dt>
                Completed
              </dt>

              <dd>
                {formatDateTime(
                  log.completedAt,
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="partner-admin-panel partner-admin-card">
          <h3>
            Request Body (Redacted)
          </h3>

          <pre>
            {prettyJson(
              log.requestBodyRedacted,
            )}
          </pre>
        </section>

        <section className="partner-admin-panel partner-admin-card">
          <h3>
            Response Body (Redacted)
          </h3>

          <pre>
            {prettyJson(
              log.responseBodyRedacted,
            )}
          </pre>
        </section>

        {Boolean(log.safeHeaders) && (
          <section className="partner-admin-panel partner-admin-card">
            <h3>
              Safe Headers
            </h3>

            <pre>
              {prettyJson(
                log.safeHeaders,
              )}
            </pre>
          </section>
        )}
      </div>

      <section className="partner-admin-security-note">
        <strong>
          Admin không có nút Retry.
        </strong>

        <p>
          Partner API là M2M
          endpoint. Trường hợp lỗi
          mạng hoặc HTTP 5xx,
          Partner client phải chủ
          động retry bằng cùng
          Idempotency-Key.
        </p>
      </section>
    </div>
  );
}

export default PartnerApiLogDetailPage;
