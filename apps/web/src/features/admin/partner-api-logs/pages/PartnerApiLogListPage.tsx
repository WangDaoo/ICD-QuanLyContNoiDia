import {
  FormEvent,
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  partnerApiLogApi,
} from '../api/partner-api-log.api';

import type {
  PartnerApiLogPage,
  PartnerApiLogQuery,
} from '../partner-api-log.types';

import '../../partner-gateway/PartnerGatewayAdmin.css';

const EMPTY_PAGE:
  PartnerApiLogPage = {
    items: [],
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  };

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

function httpTone(
  status: number,
): string {
  if (
    status >= 200 &&
    status < 300
  ) {
    return 'success';
  }

  if (status >= 500) {
    return 'danger';
  }

  if (status >= 400) {
    return 'warning';
  }

  return 'neutral';
}

export function PartnerApiLogListPage() {
  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();

  const [
    pageData,
    setPageData,
  ] =
    useState<
      PartnerApiLogPage
    >(EMPTY_PAGE);

  const [
    partnerApiClientId,
    setPartnerApiClientId,
  ] =
    useState(
      searchParams.get(
        'partnerApiClientId',
      ) ?? '',
    );

  const [
    endpoint,
    setEndpoint,
  ] =
    useState(
      searchParams.get(
        'endpoint',
      ) ?? '',
    );

  const [
    handoverId,
    setHandoverId,
  ] =
    useState(
      searchParams.get(
        'handoverId',
      ) ?? '',
    );

  const [
    containerNumber,
    setContainerNumber,
  ] =
    useState(
      searchParams.get(
        'containerNumber',
      ) ?? '',
    );

  const [
    httpStatus,
    setHttpStatus,
  ] =
    useState(
      searchParams.get(
        'httpStatus',
      ) ?? '',
    );

  const [
    from,
    setFrom,
  ] = useState('');

  const [
    to,
    setTo,
  ] = useState('');

  const [
    query,
    setQuery,
  ] =
    useState<PartnerApiLogQuery>({
      partnerApiClientId:
        searchParams.get(
          'partnerApiClientId',
        ) ??
        undefined,

      page: 1,
      limit: 25,
    });

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
        try {
          setLoading(true);
          setError(null);

          setPageData(
            await partnerApiLogApi.list(
              query,
            ),
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Không thể tải Partner API Logs.',
          );
        } finally {
          setLoading(false);
        }
      },
      [query],
    );

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const next:
      PartnerApiLogQuery = {
      partnerApiClientId:
        partnerApiClientId ||
        undefined,

      endpoint:
        endpoint ||
        undefined,

      handoverId:
        handoverId ||
        undefined,

      containerNumber:
        containerNumber ||
        undefined,

      httpStatus:
        httpStatus ||
        undefined,

      from:
        from
          ? new Date(
              `${from}T00:00:00`,
            ).toISOString()
          : undefined,

      to:
        to
          ? new Date(
              `${to}T23:59:59`,
            ).toISOString()
          : undefined,

      page: 1,
      limit:
        query.limit,
    };

    setQuery(next);

    const params =
      new URLSearchParams();

    if (
      next.partnerApiClientId
    ) {
      params.set(
        'partnerApiClientId',
        next.partnerApiClientId,
      );
    }

    if (next.endpoint) {
      params.set(
        'endpoint',
        next.endpoint,
      );
    }

    if (
      next.containerNumber
    ) {
      params.set(
        'containerNumber',
        next.containerNumber,
      );
    }

    setSearchParams(
      params,
      {
        replace: true,
      },
    );
  }

  return (
    <div className="partner-admin-page">
      <div className="partner-admin-toolbar">
        <div>
          <span>
            PARTNER GATEWAY
          </span>

          <h2>
            Partner API Logs
          </h2>

          <p>
            Request trace, idempotency,
            latency và business result
            từ External Partner API.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            void load();
          }}
        >
          ↻ Làm mới
        </button>
      </div>

      {error && (
        <div className="partner-admin-message partner-admin-message--error">
          {error}
        </div>
      )}

      <form
        className="partner-log-filters"
        onSubmit={
          applyFilters
        }
      >
        <input
          placeholder="Partner Client ID"
          value={
            partnerApiClientId
          }
          onChange={(
            event,
          ) =>
            setPartnerApiClientId(
              event.target
                .value,
            )
          }
        />

        <input
          placeholder="Endpoint"
          value={endpoint}
          onChange={(
            event,
          ) =>
            setEndpoint(
              event.target
                .value,
            )
          }
        />

        <input
          placeholder="Handover ID"
          value={handoverId}
          onChange={(
            event,
          ) =>
            setHandoverId(
              event.target
                .value,
            )
          }
        />

        <input
          placeholder="Container"
          value={
            containerNumber
          }
          onChange={(
            event,
          ) =>
            setContainerNumber(
              event.target
                .value
                .toUpperCase(),
            )
          }
        />

        <select
          value={httpStatus}
          onChange={(
            event,
          ) =>
            setHttpStatus(
              event.target
                .value,
            )
          }
        >
          <option value="">
            HTTP tất cả
          </option>

          <option value="2xx">
            2xx
          </option>

          <option value="4xx">
            4xx
          </option>

          <option value="5xx">
            5xx
          </option>
        </select>

        <input
          type="date"
          value={from}
          onChange={(
            event,
          ) =>
            setFrom(
              event.target
                .value,
            )
          }
        />

        <input
          type="date"
          value={to}
          onChange={(
            event,
          ) =>
            setTo(
              event.target
                .value,
            )
          }
        />

        <button
          type="submit"
        >
          Áp dụng
        </button>
      </form>

      <section className="partner-admin-panel">
        <div className="partner-log-summary">
          <strong>
            {pageData.total}
          </strong>

          <span>
            request logs
          </span>
        </div>

        <div className="partner-admin-table-wrapper">
          <table className="partner-admin-table partner-log-table">
            <thead>
              <tr>
                <th>
                  TIME
                </th>

                <th>
                  PARTNER
                </th>

                <th>
                  REQUEST
                </th>

                <th>
                  TRANSPORT / CONTAINER
                </th>

                <th>
                  HTTP
                </th>

                <th>
                  BUSINESS
                </th>

                <th>
                  ERROR
                </th>

                <th>
                  REQUEST ID
                </th>

                <th>
                  LATENCY
                </th>

                <th />
              </tr>
            </thead>

            <tbody>
              {pageData.items.map(
                (log) => (
                  <tr
                    key={
                      log.id
                    }
                  >
                    <td>
                      {formatDateTime(
                        log.createdAt,
                      )}
                    </td>

                    <td>
                      {log.partnerName ??
                        log.partnerCode ??
                        '—'}
                    </td>

                    <td>
                      <strong>
                        {
                          log.method
                        }
                      </strong>

                      <small>
                        {
                          log.endpoint
                        }
                      </small>
                    </td>

                    <td>
                      {log.transportCode ??
                        '—'}

                      <small>
                        {log.containerNumber ??
                          '—'}
                      </small>
                    </td>

                    <td>
                      <span
                        className={`partner-http-status partner-http-status--${httpTone(
                          log.httpStatus,
                        )}`}
                      >
                        {
                          log.httpStatus
                        }
                      </span>
                    </td>

                    <td>
                      {log.businessStatus ??
                        '—'}
                    </td>

                    <td>
                      {log.errorCode ??
                        '—'}
                    </td>

                    <td>
                      <code>
                        {log.requestId ??
                          '—'}
                      </code>
                    </td>

                    <td>
                      {log.latencyMs !==
                        null &&
                      log.latencyMs !==
                        undefined
                        ? `${log.latencyMs} ms`
                        : '—'}
                    </td>

                    <td>
                      <Link
                        to={`/admin/partner-api-logs/${encodeURIComponent(
                          log.id,
                        )}`}
                      >
                        Detail
                      </Link>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>

        <div className="partner-pagination">
          <button
            type="button"
            disabled={
              pageData.page <= 1
            }
            onClick={() =>
              setQuery(
                (current) => ({
                  ...current,
                  page:
                    current.page -
                    1,
                }),
              )
            }
          >
            ← Trước
          </button>

          <span>
            Trang{' '}
            {pageData.page}
            {' / '}
            {
              pageData.totalPages
            }
          </span>

          <button
            type="button"
            disabled={
              pageData.page >=
              pageData.totalPages
            }
            onClick={() =>
              setQuery(
                (current) => ({
                  ...current,
                  page:
                    current.page +
                    1,
                }),
              )
            }
          >
            Sau →
          </button>
        </div>
      </section>

      {loading && (
        <div className="partner-log-loading">
          Đang tải...
        </div>
      )}
    </div>
  );
}

export default PartnerApiLogListPage;
