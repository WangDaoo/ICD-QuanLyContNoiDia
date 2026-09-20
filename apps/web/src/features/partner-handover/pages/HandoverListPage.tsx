import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useSearchParams,
} from 'react-router-dom';

import {
  handoverApi,
} from '../api/handover.api';

import type {
  TransportHandover,
} from '../handover.types';

import './Handovers.css';

const QUICK_FILTERS = [
  {
    value:
      'READY_FOR_HANDOVER',

    label:
      'Ready',
  },
  {
    value:
      'IN_TRANSIT',

    label:
      'In transit',
  },
  {
    value:
      'PARTNER_CONFIRMED',

    label:
      'Chờ ICD xác nhận',
  },
  {
    value:
      'DISPUTED',

    label:
      'Disputed',
  },
  {
    value:
      'COMPLETED',

    label:
      'Completed',
  },
];

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

function tone(
  status: string,
): string {
  switch (
    status
  ) {
    case 'COMPLETED':
    case 'ICD_CONFIRMED':
      return 'success';

    case 'PARTNER_CONFIRMED':
    case 'IN_TRANSIT':
    case 'PARTNER_ACCEPTED':
      return 'primary';

    case 'DISPUTED':
    case 'PARTNER_REJECTED':
    case 'DELIVERY_FAILED':
      return 'danger';

    case 'READY_FOR_HANDOVER':
      return 'warning';

    default:
      return 'neutral';
  }
}

export function HandoverListPage() {
  const [
    searchParams,
    setSearchParams,
  ] =
    useSearchParams();

  const [
    items,
    setItems,
  ] =
    useState<
      TransportHandover[]
    >([]);

  const [
    search,
    setSearch,
  ] =
    useState(
      searchParams.get(
        'search',
      ) ?? '',
    );

  const [
    status,
    setStatus,
  ] =
    useState(
      searchParams.get(
        'status',
      ) ?? 'ALL',
    );

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

          setItems(
            await handoverApi.list(),
          );
        } catch (
          loadError
        ) {
          setError(
            loadError instanceof
              Error
              ? loadError.message
              : 'Không thể tải Handover.',
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  useEffect(() => {
    void load();
  }, [load]);

  const filtered =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toUpperCase();

      return items.filter(
        (item) => {
          if (
            status !==
              'ALL' &&
            item.status !==
              status
          ) {
            return false;
          }

          if (!needle) {
            return true;
          }

          return [
            item.handoverNumber,
            item.transportCode,
            item.containerNumber,
            item.partnerName,
            item.partnerCode,
            item.warehouseName,
            item.warehouseCode,
          ].some(
            (value) =>
              value
                ?.toUpperCase()
                .includes(
                  needle,
                ) ?? false,
          );
        },
      );
    }, [
      items,
      search,
      status,
    ]);

  const stats =
    useMemo(
      () => ({
        ready:
          items.filter(
            (item) =>
              item.status ===
              'READY_FOR_HANDOVER',
          ).length,

        inTransit:
          items.filter(
            (item) =>
              item.status ===
              'IN_TRANSIT',
          ).length,

        review:
          items.filter(
            (item) =>
              item.status ===
              'PARTNER_CONFIRMED',
          ).length,

        disputed:
          items.filter(
            (item) =>
              item.status ===
              'DISPUTED',
          ).length,
      }),
      [items],
    );

  function chooseStatus(
    value: string,
  ) {
    setStatus(value);

    const next =
      new URLSearchParams(
        searchParams,
      );

    if (
      value === 'ALL'
    ) {
      next.delete(
        'status',
      );
    } else {
      next.set(
        'status',
        value,
      );
    }

    setSearchParams(
      next,
      {
        replace: true,
      },
    );
  }

  if (loading) {
    return (
      <div className="handover-state">
        <div className="handover-spinner" />

        <strong>
          Đang tải Transport Handover
        </strong>
      </div>
    );
  }

  return (
    <div className="handover-page">
      <div className="handover-toolbar">
        <div>
          <span>
            PARTNER INTEGRATION
          </span>

          <h2>
            Transport Handover
          </h2>

          <p>
            Theo dõi bàn giao sau
            Gate-out và confirmation
            từ Logistics Partner.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => {
              void load();
            }}
          >
            ↻ Làm mới
          </button>

          <Link
            to="/handovers/new"
          >
            + Tạo Handover
          </Link>
        </div>
      </div>

      {error && (
        <div className="handover-message handover-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      <section className="handover-kpis">
        <article>
          <span>
            READY
          </span>

          <strong>
            {stats.ready}
          </strong>
        </article>

        <article>
          <span>
            IN TRANSIT
          </span>

          <strong>
            {stats.inTransit}
          </strong>
        </article>

        <article className="handover-kpi--review">
          <span>
            CHỜ ICD XÁC NHẬN
          </span>

          <strong>
            {stats.review}
          </strong>
        </article>

        <article className="handover-kpi--danger">
          <span>
            DISPUTED
          </span>

          <strong>
            {stats.disputed}
          </strong>
        </article>
      </section>

      <div className="handover-quick-filters">
        <button
          type="button"
          className={
            status === 'ALL'
              ? 'handover-quick-filter handover-quick-filter--active'
              : 'handover-quick-filter'
          }
          onClick={() =>
            chooseStatus(
              'ALL',
            )
          }
        >
          Tất cả
        </button>

        {QUICK_FILTERS.map(
          (filter) => (
            <button
              key={
                filter.value
              }
              type="button"
              className={
                status ===
                filter.value
                  ? 'handover-quick-filter handover-quick-filter--active'
                  : 'handover-quick-filter'
              }
              onClick={() =>
                chooseStatus(
                  filter.value,
                )
              }
            >
              {
                filter.label
              }
            </button>
          ),
        )}
      </div>

      <section className="handover-panel">
        <div className="handover-filterbar">
          <div className="handover-search">
            <span>⌕</span>

            <input
              type="search"
              value={search}
              placeholder="Transport code, container, partner, warehouse..."
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
            />
          </div>

          <select
            value={status}
            onChange={(
              event,
            ) =>
              chooseStatus(
                event.target
                  .value,
              )
            }
          >
            <option value="ALL">
              Tất cả trạng thái
            </option>

            <option value="DRAFT">
              Draft
            </option>

            <option value="READY_FOR_HANDOVER">
              Ready
            </option>

            <option value="PARTNER_ACCEPTED">
              Partner accepted
            </option>

            <option value="IN_TRANSIT">
              In transit
            </option>

            <option value="PARTNER_CONFIRMED">
              Partner confirmed
            </option>

            <option value="COMPLETED">
              Completed
            </option>

            <option value="DISPUTED">
              Disputed
            </option>

            <option value="PARTNER_REJECTED">
              Partner rejected
            </option>

            <option value="DELIVERY_FAILED">
              Delivery failed
            </option>
          </select>
        </div>

        <div className="handover-table-wrapper">
          <table className="handover-table">
            <thead>
              <tr>
                <th>
                  TRANSPORT CODE
                </th>

                <th>
                  CONTAINER
                </th>

                <th>
                  PARTNER
                </th>

                <th>
                  KHO ĐÍCH
                </th>

                <th>
                  STATUS
                </th>

                <th>
                  READY
                </th>

                <th>
                  PARTNER CONFIRM
                </th>

                <th />
              </tr>
            </thead>

            <tbody>
              {filtered.map(
                (item) => (
                  <tr
                    key={
                      item.id
                    }
                  >
                    <td>
                      <Link
                        to={`/handovers/${encodeURIComponent(
                          item.id,
                        )}`}
                        className="handover-code"
                      >
                        {
                          item.transportCode
                        }
                      </Link>

                      {item.handoverNumber && (
                        <small>
                          {
                            item.handoverNumber
                          }
                        </small>
                      )}
                    </td>

                    <td>
                      {item.containerNumber ? (
                        <Link
                          to={`/containers/${encodeURIComponent(
                            item.visitId,
                          )}`}
                          className="handover-container-link"
                        >
                          {
                            item.containerNumber
                          }
                        </Link>
                      ) : (
                        '—'
                      )}

                      <small>
                        {item.containerStatus ??
                          '—'}
                      </small>
                    </td>

                    <td>
                      {item.partnerName ??
                        item.partnerCode ??
                        '—'}
                    </td>

                    <td>
                      {item.warehouseName ??
                        item.warehouseCode ??
                        '—'}
                    </td>

                    <td>
                      <span
                        className={`handover-status handover-status--${tone(
                          item.status,
                        )}`}
                      >
                        {
                          item.status
                        }
                      </span>
                    </td>

                    <td>
                      {formatDateTime(
                        item.readyAt,
                      )}
                    </td>

                    <td>
                      {formatDateTime(
                        item.partnerConfirmedAt,
                      )}
                    </td>

                    <td>
                      <Link
                        className={
                          item.status ===
                          'PARTNER_CONFIRMED'
                            ? 'handover-review-link'
                            : 'handover-detail-link'
                        }
                        to={`/handovers/${encodeURIComponent(
                          item.id,
                        )}`}
                      >
                        {item.status ===
                        'PARTNER_CONFIRMED'
                          ? 'Review →'
                          : 'Chi tiết →'}
                      </Link>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>

          {filtered.length ===
            0 && (
            <div className="handover-empty">
              Không có Handover phù
              hợp.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default HandoverListPage;
