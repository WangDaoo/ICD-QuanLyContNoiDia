import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  manifestApi,
} from '../api/manifest.api';

import type {
  ManifestListItem,
} from '../manifest.types';

import './Manifests.css';

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Không thể tải danh sách Manifest.';
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

function statusTone(
  status: string,
): string {
  switch (
    status.toUpperCase()
  ) {
    case 'CONFIRMED':
    case 'COMPLETED':
      return 'success';

    case 'DRAFT':
      return 'neutral';

    case 'OPEN':
      return 'primary';

    case 'CANCELLED':
      return 'danger';

    default:
      return 'neutral';
  }
}

export function ManifestListPage() {
  const navigate =
    useNavigate();

  const [
    items,
    setItems,
  ] =
    useState<
      ManifestListItem[]
    >([]);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    status,
    setStatus,
  ] = useState('ALL');

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
            await manifestApi.list(),
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
            item.manifestNumber,
            item.vesselName,
            item.voyageNumber,
            item.shippingLineName,
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

        open:
          items.filter(
            (item) =>
              item.status ===
              'OPEN',
          ).length,

        mbl:
          items.reduce(
            (
              total,
              item,
            ) =>
              total +
              item.masterBlCount,
            0,
          ),

        containers:
          items.reduce(
            (
              total,
              item,
            ) =>
              total +
              item.containerCount,
            0,
          ),
      }),
      [items],
    );

  if (
    loading &&
    items.length === 0
  ) {
    return (
      <div className="manifest-state">
        <div className="manifest-spinner" />

        <strong>
          Đang tải Manifest
        </strong>
      </div>
    );
  }

  if (
    error &&
    items.length === 0
  ) {
    return (
      <div className="manifest-state">
        <strong>
          Không thể tải Manifest
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
    <div className="manifest-page">
      <div className="manifest-toolbar">
        <div>
          <h2>
            Manifest
          </h2>

          <p>
            Theo dõi Manifest,
            Master BL, House BL
            và container.
          </p>
        </div>

        <button
          type="button"
          className="manifest-refresh"
          onClick={() => {
            void load();
          }}
        >
          ↻ Làm mới
        </button>
      </div>

      <section className="manifest-stats">
        <article>
          <span>
            MANIFEST
          </span>

          <strong>
            {stats.total}
          </strong>
        </article>

        <article>
          <span>
            ĐANG MỞ
          </span>

          <strong>
            {stats.open}
          </strong>
        </article>

        <article>
          <span>
            MASTER BL
          </span>

          <strong>
            {stats.mbl}
          </strong>
        </article>

        <article>
          <span>
            CONTAINER
          </span>

          <strong>
            {stats.containers}
          </strong>
        </article>
      </section>

      <section className="manifest-panel">
        <div className="manifest-filterbar">
          <div className="manifest-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Manifest, tàu, voyage, shipping line..."
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

            <option value="DRAFT">
              Draft
            </option>

            <option value="OPEN">
              Open
            </option>

            <option value="CONFIRMED">
              Confirmed
            </option>

            <option value="COMPLETED">
              Completed
            </option>

            <option value="CANCELLED">
              Cancelled
            </option>
          </select>

          <span className="manifest-result-count">
            {filtered.length}
            {' / '}
            {items.length}
            {' manifest'}
          </span>
        </div>

        {filtered.length ===
        0 ? (
          <div className="manifest-empty">
            <span>▤</span>

            <strong>
              Không tìm thấy
              Manifest
            </strong>
          </div>
        ) : (
          <div className="manifest-table-wrapper">
            <table className="manifest-table">
              <thead>
                <tr>
                  <th>
                    MANIFEST
                  </th>

                  <th>
                    TRẠNG THÁI
                  </th>

                  <th>
                    TÀU / VOYAGE
                  </th>

                  <th>
                    SHIPPING LINE
                  </th>

                  <th>
                    ETA
                  </th>

                  <th>
                    MBL / HBL
                  </th>

                  <th>
                    CONTAINER
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
                          `/manifests/${encodeURIComponent(
                            item.id,
                          )}`,
                        )
                      }
                    >
                      <td>
                        <strong className="manifest-number">
                          {
                            item.manifestNumber
                          }
                        </strong>
                      </td>

                      <td>
                        <span
                          className={[
                            'manifest-status',
                            `manifest-status--${statusTone(
                              item.status,
                            )}`,
                          ].join(
                            ' ',
                          )}
                        >
                          {
                            item.status
                          }
                        </span>
                      </td>

                      <td>
                        <div className="manifest-vessel">
                          <strong>
                            {item.vesselName ??
                              '—'}
                          </strong>

                          <span>
                            {item.voyageNumber ??
                              '—'}
                          </span>
                        </div>
                      </td>

                      <td>
                        {item.shippingLineName ??
                          '—'}
                      </td>

                      <td>
                        {formatDateTime(
                          item.eta,
                        )}
                      </td>

                      <td>
                        {item.masterBlCount}
                        {' / '}
                        {item.houseBlCount}
                      </td>

                      <td>
                        <strong>
                          {
                            item.containerCount
                          }
                        </strong>
                      </td>

                      <td>
                        <button
                          type="button"
                          className="manifest-open"
                          onClick={() =>
                            navigate(
                              `/manifests/${encodeURIComponent(
                                item.id,
                              )}`,
                            )
                          }
                        >
                          Chi tiết →
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

export default ManifestListPage;
