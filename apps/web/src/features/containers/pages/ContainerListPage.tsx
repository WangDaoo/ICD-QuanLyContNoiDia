import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  containerApi,
} from '../api/container.api';

import type {
  ContainerListItem,
} from '../container.types';

import './Containers.css';

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

            message?: string;
          };
        }
      ).body;

    if (
      body?.error?.message
    ) {
      return body.error
        .message;
    }

    if (body?.message) {
      return body.message;
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Không thể tải danh sách container.';
}

function getStatusLabel(
  status: string,
): string {
  switch (
    status.toUpperCase()
  ) {
    case 'PENDING':
      return 'Chờ xử lý';

    case 'AUTHORIZED':
      return 'Đã ủy quyền';

    case 'IN_YARD':
      return 'Trong bãi';

    case 'GATE_PASS_ISSUED':
      return 'Đã cấp Gate Pass';

    case 'EXITED':
      return 'Đã Gate-out';

    case 'CANCELLED':
      return 'Đã hủy';

    default:
      return status;
  }
}

function getStatusClass(
  status: string,
): string {
  switch (
    status.toUpperCase()
  ) {
    case 'IN_YARD':
      return 'yard';

    case 'EXITED':
      return 'success';

    case 'AUTHORIZED':
    case 'GATE_PASS_ISSUED':
      return 'primary';

    case 'CANCELLED':
      return 'danger';

    default:
      return 'neutral';
  }
}

function formatDate(
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

export function ContainerListPage() {
  const navigate =
    useNavigate();

  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const initialSearch =
    searchParams.get(
      'search',
    ) ?? '';

  const [
    search,
    setSearch,
  ] =
    useState(
      initialSearch,
    );

  const [
    status,
    setStatus,
  ] =
    useState('ALL');

  const [
    items,
    setItems,
  ] =
    useState<
      ContainerListItem[]
    >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
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

          const data =
            await containerApi.list();

          setItems(data);
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

  useEffect(() => {
    if (
      search.trim()
    ) {
      setSearchParams({
        search:
          search.trim(),
      });
    } else {
      setSearchParams({});
    }
  }, [
    search,
    setSearchParams,
  ]);

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
            item.containerNumber,
            item.consigneeName,
            item.hblNumber,
            item.mblNumber,
            item.yardPosition,
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
        total:
          items.length,

        inYard:
          items.filter(
            (item) =>
              item.status ===
              'IN_YARD',
          ).length,

        gatePass:
          items.filter(
            (item) =>
              item.status ===
              'GATE_PASS_ISSUED',
          ).length,

        exited:
          items.filter(
            (item) =>
              item.status ===
              'EXITED',
          ).length,
      }),
      [items],
    );

  if (
    loading &&
    items.length === 0
  ) {
    return (
      <div className="containers-state">
        <div className="containers-spinner" />

        <strong>
          Đang tải container
        </strong>
      </div>
    );
  }

  if (
    error &&
    items.length === 0
  ) {
    return (
      <div className="containers-state">
        <div className="containers-error-icon">
          !
        </div>

        <strong>
          Không thể tải container
        </strong>

        <span>
          {error}
        </span>

        <button
          type="button"
          onClick={() => {
            void load();
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="containers-page">
      <div className="containers-toolbar">
        <div>
          <h2>
            Quản lý Container
          </h2>

          <p>
            Tra cứu trạng thái,
            vị trí và vòng đời
            container.
          </p>
        </div>

        <button
          type="button"
          className="containers-refresh"
          disabled={
            refreshing
          }
          onClick={() => {
            void load(true);
          }}
        >
          <span
            className={
              refreshing
                ? 'containers-refresh__icon containers-refresh__icon--spin'
                : 'containers-refresh__icon'
            }
          >
            ↻
          </span>

          {refreshing
            ? 'Đang tải'
            : 'Làm mới'}
        </button>
      </div>

      {error && (
        <div className="containers-inline-error">
          !
          <span>
            {error}
          </span>
        </div>
      )}

      <section className="containers-stats">
        <article>
          <span>
            TỔNG CONTAINER
          </span>

          <strong>
            {stats.total}
          </strong>
        </article>

        <article>
          <span>
            TRONG BÃI
          </span>

          <strong>
            {stats.inYard}
          </strong>
        </article>

        <article>
          <span>
            GATE PASS
          </span>

          <strong>
            {stats.gatePass}
          </strong>
        </article>

        <article>
          <span>
            ĐÃ GATE-OUT
          </span>

          <strong>
            {stats.exited}
          </strong>
        </article>
      </section>

      <section className="containers-panel">
        <div className="containers-filterbar">
          <div className="containers-search">
            <span>
              ⌕
            </span>

            <input
              type="search"
              placeholder="Tìm số container, consignee, MBL, HBL, vị trí..."
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
            value={status}
            onChange={(
              event,
            ) =>
              setStatus(
                event.target
                  .value,
              )
            }
          >
            <option value="ALL">
              Tất cả trạng thái
            </option>

            <option value="PENDING">
              Chờ xử lý
            </option>

            <option value="AUTHORIZED">
              Đã ủy quyền
            </option>

            <option value="IN_YARD">
              Trong bãi
            </option>

            <option value="GATE_PASS_ISSUED">
              Gate Pass
            </option>

            <option value="EXITED">
              Đã Gate-out
            </option>

            <option value="CANCELLED">
              Đã hủy
            </option>
          </select>

          <span className="containers-result-count">
            {filtered.length}
            {' / '}
            {items.length}
            {' container'}
          </span>
        </div>

        {filtered.length ===
        0 ? (
          <div className="containers-empty">
            <span>▣</span>

            <strong>
              Không tìm thấy
              container
            </strong>

            <small>
              Thử thay đổi từ
              khóa hoặc bộ lọc.
            </small>
          </div>
        ) : (
          <div className="containers-table-wrapper">
            <table className="containers-table">
              <thead>
                <tr>
                  <th>
                    CONTAINER
                  </th>

                  <th>
                    TRẠNG THÁI
                  </th>

                  <th>
                    SIZE / TYPE
                  </th>

                  <th>
                    VỊ TRÍ
                  </th>

                  <th>
                    CONSIGNEE
                  </th>

                  <th>
                    HBL / MBL
                  </th>

                  <th>
                    GATE-IN
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {filtered.map(
                  (item) => (
                    <tr
                      key={
                        item.visitId
                      }
                      onDoubleClick={() =>
                        navigate(
                          `/containers/${encodeURIComponent(
                            item.visitId,
                          )}`,
                        )
                      }
                    >
                      <td>
                        <strong className="containers-number">
                          {
                            item.containerNumber
                          }
                        </strong>

                        {item.isoCode && (
                          <small className="containers-subtext">
                            {
                              item.isoCode
                            }
                          </small>
                        )}
                      </td>

                      <td>
                        <span
                          className={[
                            'containers-status',
                            `containers-status--${getStatusClass(
                              item.status,
                            )}`,
                          ].join(
                            ' ',
                          )}
                        >
                          {getStatusLabel(
                            item.status,
                          )}
                        </span>
                      </td>

                      <td>
                        <span>
                          {[
                            item.size,
                            item.type,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              ' · ',
                            ) ||
                            '—'}
                        </span>
                      </td>

                      <td>
                        <strong className="containers-position">
                          {item.yardPosition ??
                            '—'}
                        </strong>
                      </td>

                      <td>
                        {item.consigneeName ??
                          '—'}
                      </td>

                      <td>
                        <div className="containers-bl">
                          <span>
                            HBL:{' '}
                            {item.hblNumber ??
                              '—'}
                          </span>

                          <span>
                            MBL:{' '}
                            {item.mblNumber ??
                              '—'}
                          </span>
                        </div>
                      </td>

                      <td>
                        {formatDate(
                          item.gateInAt,
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className="containers-open"
                          onClick={() =>
                            navigate(
                              `/containers/${encodeURIComponent(
                                item.visitId,
                              )}`,
                            )
                          }
                        >
                          Chi tiết
                          <span>
                            →
                          </span>
                        </button>
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

export default ContainerListPage;
