import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  containerApi,
} from '../../containers/api/container.api';

import {
  yardApi,
} from '../api/yard.api';

import {
  YardSlotGrid,
} from '../components/YardSlotGrid';

import type {
  YardCandidateContainer,
  YardSlot,
} from '../yard.types';

import './Yard.css';

type ViewMode =
  | 'GRID'
  | 'LIST';

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Không thể tải dữ liệu Yard.';
}

function getSlotTone(
  slot: YardSlot,
): string {
  if (
    !slot.isOperational ||
    slot.status ===
      'MAINTENANCE' ||
    slot.status ===
      'BLOCKED'
  ) {
    return 'maintenance';
  }

  if (
    slot.status ===
      'OCCUPIED' ||
    slot.currentContainer
  ) {
    return 'occupied';
  }

  return 'available';
}

function formatWeight(
  value?: number | null,
): string {
  if (!value) {
    return '—';
  }

  return `${new Intl.NumberFormat(
    'vi-VN',
  ).format(value)} kg`;
}

export function YardOverviewPage() {
  const [
    slots,
    setSlots,
  ] =
    useState<
      YardSlot[]
    >([]);

  const [
    unassigned,
    setUnassigned,
  ] =
    useState<
      YardCandidateContainer[]
    >([]);

  const [
    view,
    setView,
  ] =
    useState<ViewMode>(
      'GRID',
    );

  const [
    blockFilter,
    setBlockFilter,
  ] = useState('ALL');

  const [
    statusFilter,
    setStatusFilter,
  ] = useState('ALL');

  const [
    search,
    setSearch,
  ] = useState('');

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

          const [
            slotData,
            containers,
          ] =
            await Promise.all([
              yardApi.getSlots(),

              containerApi.list(),
            ]);

          setSlots(
            slotData,
          );

          setUnassigned(
            containers
              .filter(
                (container) =>
                  container.status ===
                    'IN_YARD' &&
                  !container.yardPosition,
              )
              .map(
                (
                  container,
                ): YardCandidateContainer => ({
                  visitId:
                    container.visitId,

                  containerNumber:
                    container.containerNumber,

                  size:
                    container.size ??
                    null,

                  type:
                    container.type ??
                    null,

                  isoCode:
                    container.isoCode ??
                    null,

                  grossWeight:
                    null,

                  yardPosition:
                    container.yardPosition,
                }),
              ),
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

  const blocks =
    useMemo(
      () =>
        Array.from(
          new Set(
            slots
              .map(
                (slot) =>
                  slot.block,
              )
              .filter(Boolean),
          ),
        ).sort(),
      [slots],
    );

  const filteredSlots =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toUpperCase();

      return slots.filter(
        (slot) => {
          if (
            blockFilter !==
              'ALL' &&
            slot.block !==
              blockFilter
          ) {
            return false;
          }

          const tone =
            getSlotTone(
              slot,
            );

          if (
            statusFilter !==
              'ALL' &&
            tone.toUpperCase() !==
              statusFilter
          ) {
            return false;
          }

          if (!needle) {
            return true;
          }

          return [
            slot.label,
            slot.block,
            slot.row,
            slot.bay,
            slot.tier,
            slot.currentContainer
              ?.containerNumber,
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
      slots,
      blockFilter,
      statusFilter,
      search,
    ]);

  const stats =
    useMemo(() => {
      const available =
        slots.filter(
          (slot) =>
            getSlotTone(
              slot,
            ) ===
            'available',
        ).length;

      const occupied =
        slots.filter(
          (slot) =>
            getSlotTone(
              slot,
            ) ===
            'occupied',
        ).length;

      const maintenance =
        slots.filter(
          (slot) =>
            getSlotTone(
              slot,
            ) ===
            'maintenance',
        ).length;

      return {
        total:
          slots.length,

        available,

        occupied,

        maintenance,

        occupancy:
          slots.length > 0
            ? (
                occupied /
                slots.length
              ) * 100
            : 0,
      };
    }, [slots]);

  if (
    loading &&
    slots.length === 0
  ) {
    return (
      <div className="yard-state">
        <div className="yard-spinner" />

        <strong>
          Đang tải Yard
        </strong>
      </div>
    );
  }

  return (
    <div className="yard-page">
      <div className="yard-toolbar">
        <div>
          <h2>
            Yard Management
          </h2>

          <p>
            Theo dõi sức chứa,
            vị trí container và
            phân bổ Yard Slot.
          </p>
        </div>

        <button
          type="button"
          className="yard-refresh"
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
      </div>

      {error && (
        <div className="yard-message yard-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      <section className="yard-stats">
        <article>
          <span>
            TỔNG SLOT
          </span>

          <strong>
            {stats.total}
          </strong>
        </article>

        <article className="yard-stat--available">
          <span>
            AVAILABLE
          </span>

          <strong>
            {stats.available}
          </strong>
        </article>

        <article className="yard-stat--occupied">
          <span>
            OCCUPIED
          </span>

          <strong>
            {stats.occupied}
          </strong>
        </article>

        <article>
          <span>
            OCCUPANCY
          </span>

          <strong>
            {stats.occupancy.toFixed(
              1,
            )}
            %
          </strong>
        </article>
      </section>

      {unassigned.length > 0 && (
        <section className="yard-unassigned">
          <div className="yard-unassigned__heading">
            <div>
              <span>
                YARD ASSIGN
              </span>

              <strong>
                Container chưa có
                vị trí
              </strong>
            </div>

            <b>
              {unassigned.length}
            </b>
          </div>

          <div className="yard-unassigned__list">
            {unassigned
              .slice(
                0,
                6,
              )
              .map(
                (container) => (
                  <article
                    key={
                      container.visitId
                    }
                  >
                    <div>
                      <strong>
                        {
                          container.containerNumber
                        }
                      </strong>

                      <small>
                        {[
                          container.size,
                          container.type,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            ' · ',
                          )}
                      </small>
                    </div>

                    <Link
                      to={`/yard/${encodeURIComponent(
                        container.visitId,
                      )}/assign`}
                    >
                      Xếp vị trí →
                    </Link>
                  </article>
                ),
              )}
          </div>
        </section>
      )}

      <section className="yard-panel">
        <div className="yard-panel__toolbar">
          <div className="yard-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Tìm slot hoặc container..."
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
              blockFilter
            }
            onChange={(
              event,
            ) =>
              setBlockFilter(
                event.target
                  .value,
              )
            }
          >
            <option value="ALL">
              Tất cả Block
            </option>

            {blocks.map(
              (block) => (
                <option
                  key={block}
                  value={block}
                >
                  Block {block}
                </option>
              ),
            )}
          </select>

          <select
            value={
              statusFilter
            }
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event.target
                  .value,
              )
            }
          >
            <option value="ALL">
              Tất cả trạng thái
            </option>

            <option value="AVAILABLE">
              Available
            </option>

            <option value="OCCUPIED">
              Occupied
            </option>

            <option value="MAINTENANCE">
              Maintenance
            </option>
          </select>

          <div className="yard-view-toggle">
            <button
              type="button"
              className={
                view === 'GRID'
                  ? 'yard-view-toggle__active'
                  : ''
              }
              onClick={() =>
                setView(
                  'GRID',
                )
              }
            >
              ▦ Sơ đồ
            </button>

            <button
              type="button"
              className={
                view === 'LIST'
                  ? 'yard-view-toggle__active'
                  : ''
              }
              onClick={() =>
                setView(
                  'LIST',
                )
              }
            >
              ☷ Danh sách
            </button>
          </div>
        </div>

        {view === 'GRID' ? (
          <div className="yard-panel__content">
            <YardSlotGrid
              slots={
                filteredSlots
              }
            />
          </div>
        ) : (
          <div className="yard-table-wrapper">
            <table className="yard-table">
              <thead>
                <tr>
                  <th>
                    VỊ TRÍ
                  </th>

                  <th>
                    LOẠI
                  </th>

                  <th>
                    TRẠNG THÁI
                  </th>

                  <th>
                    CONTAINER
                  </th>

                  <th>
                    MAX WEIGHT
                  </th>

                  <th>
                    REEFER
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredSlots.map(
                  (slot) => (
                    <tr
                      key={
                        slot.id
                      }
                    >
                      <td>
                        <strong className="yard-position-code">
                          {
                            slot.label
                          }
                        </strong>
                      </td>

                      <td>
                        {slot.type ??
                          '—'}
                      </td>

                      <td>
                        <span
                          className={[
                            'yard-slot-status',
                            `yard-slot-status--${getSlotTone(
                              slot,
                            )}`,
                          ].join(
                            ' ',
                          )}
                        >
                          {getSlotTone(
                            slot,
                          ).toUpperCase()}
                        </span>
                      </td>

                      <td>
                        {slot.currentContainer
                          ?.containerNumber ? (
                          slot.currentContainer
                            .visitId ? (
                            <Link
                              to={`/containers/${encodeURIComponent(
                                slot
                                  .currentContainer
                                  .visitId,
                              )}`}
                              className="yard-container-link"
                            >
                              {
                                slot
                                  .currentContainer
                                  .containerNumber
                              }
                            </Link>
                          ) : (
                            slot
                              .currentContainer
                              .containerNumber
                          )
                        ) : (
                          '—'
                        )}
                      </td>

                      <td>
                        {formatWeight(
                          slot.maxWeight,
                        )}
                      </td>

                      <td>
                        {slot.reeferPower
                          ? 'Có'
                          : 'Không'}
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

export default YardOverviewPage;
