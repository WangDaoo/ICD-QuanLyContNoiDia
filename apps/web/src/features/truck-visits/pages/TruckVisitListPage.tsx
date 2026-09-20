import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
} from 'react-router-dom';

import {
  truckVisitApi,
} from '../api/truck-visit.api';

import type {
  TruckVisit,
} from '../truck-visit.types';

import './TruckVisits.css';

function getErrorMessage(
  error: unknown,
): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    'body' in error
  ) {
    const body =
      (
        error as {
          body?: {
            error?: {
              message?: string;
            };

            message?:
              | string
              | string[];
          };
        }
      ).body;

    if (
      body?.error?.message
    ) {
      return body.error.message;
    }

    if (
      typeof body?.message ===
      'string'
    ) {
      return body.message;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Không thể tải Truck Visits.';
}

function formatDateTime(
  value?: string | null,
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
}

function statusLabel(
  status: string,
): string {
  switch (
    status.toUpperCase()
  ) {
    case 'SCHEDULED':
      return 'Đã lên lịch';

    case 'ARRIVED':
      return 'Đã đến cổng';

    case 'IN_PROGRESS':
      return 'Đang xử lý';

    case 'COMPLETED':
      return 'Hoàn tất';

    case 'CANCELLED':
      return 'Đã hủy';

    default:
      return status;
  }
}

function statusTone(
  status: string,
): string {
  switch (
    status.toUpperCase()
  ) {
    case 'ARRIVED':
      return 'primary';

    case 'IN_PROGRESS':
      return 'warning';

    case 'COMPLETED':
      return 'success';

    case 'CANCELLED':
      return 'danger';

    default:
      return 'neutral';
  }
}

export function TruckVisitListPage() {
  const navigate =
    useNavigate();

  const [
    items,
    setItems,
  ] =
    useState<
      TruckVisit[]
    >([]);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    filterStatus,
    setFilterStatus,
  ] = useState('ALL');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionId,
    setActionId,
  ] =
    useState<
      string | null
    >(null);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(null);

  const load =
    useCallback(
      async (
        refresh = false,
      ) => {
        try {
          if (refresh) {
            setRefreshing(
              true,
            );
          } else {
            setLoading(
              true,
            );
          }

          setError(null);

          setItems(
            await truckVisitApi.list(),
          );
        } catch (
          loadError
        ) {
          setError(
            getErrorMessage(
              loadError,
            ),
          );
        } finally {
          setLoading(false);
          setRefreshing(
            false,
          );
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
            filterStatus !==
              'ALL' &&
            item.status !==
              filterStatus
          ) {
            return false;
          }

          if (!needle) {
            return true;
          }

          return [
            item.visitNumber,
            item.vehiclePlate,
            item.driverName,
            item.transporterName,
            ...item.containers.map(
              (container) =>
                container.containerNumber,
            ),
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
      filterStatus,
    ]);

  const stats =
    useMemo(
      () => ({
        total:
          items.length,

        scheduled:
          items.filter(
            (item) =>
              item.status ===
              'SCHEDULED',
          ).length,

        arrived:
          items.filter(
            (item) =>
              item.status ===
              'ARRIVED',
          ).length,

        processing:
          items.filter(
            (item) =>
              item.status ===
              'IN_PROGRESS',
          ).length,
      }),
      [items],
    );

  async function handleArrive(
    item: TruckVisit,
  ) {
    try {
      setActionId(
        item.id,
      );

      setError(null);
      setSuccess(null);

      await truckVisitApi.arrive(
        item.id,
      );

      setSuccess(
        `Đã xác nhận xe ${item.vehiclePlate} đến cổng.`,
      );

      await load(true);
    } catch (
      actionError
    ) {
      setError(
        getErrorMessage(
          actionError,
        ),
      );
    } finally {
      setActionId(null);
    }
  }

  async function handleCancel(
    item: TruckVisit,
  ) {
    const confirmed =
      window.confirm(
        `Hủy Truck Visit của xe ${item.vehiclePlate}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionId(
        item.id,
      );

      setError(null);
      setSuccess(null);

      await truckVisitApi.cancel(
        item.id,
      );

      setSuccess(
        `Đã hủy Truck Visit ${item.visitNumber ?? item.id}.`,
      );

      await load(true);
    } catch (
      actionError
    ) {
      setError(
        getErrorMessage(
          actionError,
        ),
      );
    } finally {
      setActionId(null);
    }
  }

  if (
    loading &&
    items.length === 0
  ) {
    return (
      <div className="truck-visit-state">
        <div className="truck-visit-spinner" />

        <strong>
          Đang tải Truck Visits
        </strong>
      </div>
    );
  }

  return (
    <div className="truck-visit-page">
      <div className="truck-visit-toolbar">
        <div>
          <h2>
            Truck Visits
          </h2>

          <p>
            Quản lý chuyến xe,
            lịch hẹn và container
            trước Gate-in.
          </p>
        </div>

        <div className="truck-visit-toolbar__actions">
          <button
            type="button"
            disabled={
              refreshing
            }
            onClick={() => {
              void load(true);
            }}
          >
            ↻{' '}
            {refreshing
              ? 'Đang tải'
              : 'Làm mới'}
          </button>

          <Link
            to="/truck-visits/new"
            className="truck-visit-create-link"
          >
            + Tạo Truck Visit
          </Link>
        </div>
      </div>

      {error && (
        <div className="truck-visit-message truck-visit-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      {success && (
        <div className="truck-visit-message truck-visit-message--success">
          <strong>✓</strong>
          {success}
        </div>
      )}

      <section className="truck-visit-stats">
        <article>
          <span>
            TỔNG CHUYẾN
          </span>

          <strong>
            {stats.total}
          </strong>
        </article>

        <article>
          <span>
            SCHEDULED
          </span>

          <strong>
            {stats.scheduled}
          </strong>
        </article>

        <article>
          <span>
            ARRIVED
          </span>

          <strong>
            {stats.arrived}
          </strong>
        </article>

        <article>
          <span>
            IN PROGRESS
          </span>

          <strong>
            {stats.processing}
          </strong>
        </article>
      </section>

      <section className="truck-visit-panel">
        <div className="truck-visit-filterbar">
          <div className="truck-visit-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Mã chuyến, biển số, tài xế, container..."
              value={search}
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
            value={
              filterStatus
            }
            onChange={(
              event,
            ) =>
              setFilterStatus(
                event.target
                  .value,
              )
            }
          >
            <option value="ALL">
              Tất cả trạng thái
            </option>

            <option value="SCHEDULED">
              Scheduled
            </option>

            <option value="ARRIVED">
              Arrived
            </option>

            <option value="IN_PROGRESS">
              In Progress
            </option>

            <option value="COMPLETED">
              Completed
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>
          </select>

          <span className="truck-visit-result-count">
            {filtered.length}
            {' / '}
            {items.length}
            {' chuyến'}
          </span>
        </div>

        {filtered.length ===
        0 ? (
          <div className="truck-visit-empty">
            <span>▰</span>

            <strong>
              Không có Truck Visit
              phù hợp
            </strong>
          </div>
        ) : (
          <div className="truck-visit-table-wrapper">
            <table className="truck-visit-table">
              <thead>
                <tr>
                  <th>
                    CHUYẾN
                  </th>

                  <th>
                    XE
                  </th>

                  <th>
                    TÀI XẾ
                  </th>

                  <th>
                    TRANSPORTER
                  </th>

                  <th>
                    GIỜ HẸN
                  </th>

                  <th>
                    CONTAINER
                  </th>

                  <th>
                    TRẠNG THÁI
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
                      onDoubleClick={() =>
                        navigate(
                          `/truck-visits/${encodeURIComponent(
                            item.id,
                          )}`,
                        )
                      }
                    >
                      <td>
                        <strong>
                          {item.visitNumber ??
                            item.id.slice(
                              0,
                              8,
                            )}
                        </strong>

                        {item.gateLane && (
                          <small>
                            Lane:{' '}
                            {
                              item.gateLane
                            }
                          </small>
                        )}
                      </td>

                      <td>
                        <strong className="truck-visit-plate">
                          {
                            item.vehiclePlate
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          item.driverName
                        }
                      </td>

                      <td>
                        {item.transporterName ??
                          '—'}
                      </td>

                      <td>
                        {formatDateTime(
                          item.appointmentAt,
                        )}
                      </td>

                      <td>
                        <strong>
                          {
                            item
                              .containers
                              .length
                          }
                        </strong>
                      </td>

                      <td>
                        <span
                          className={[
                            'truck-visit-status',
                            `truck-visit-status--${statusTone(
                              item.status,
                            )}`,
                          ].join(
                            ' ',
                          )}
                        >
                          {statusLabel(
                            item.status,
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="truck-visit-row-actions">
                          {item.status ===
                            'SCHEDULED' && (
                            <button
                              type="button"
                              disabled={
                                actionId ===
                                item.id
                              }
                              onClick={() => {
                                void handleArrive(
                                  item,
                                );
                              }}
                            >
                              Xác nhận ARRIVED
                            </button>
                          )}

                          {(
                            item.status ===
                              'SCHEDULED' ||
                            item.status ===
                              'ARRIVED'
                          ) && (
                            <button
                              type="button"
                              className="truck-visit-row-actions__cancel"
                              disabled={
                                actionId ===
                                item.id
                              }
                              onClick={() => {
                                void handleCancel(
                                  item,
                                );
                              }}
                            >
                              Hủy
                            </button>
                          )}

                          <Link
                            to={`/truck-visits/${encodeURIComponent(
                              item.id,
                            )}`}
                          >
                            Chi tiết →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default TruckVisitListPage;
