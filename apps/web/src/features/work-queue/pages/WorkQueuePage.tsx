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
  workQueueApi,
} from '../api/work-queue.api';

import {
  WorkQueueTable,
} from '../components/WorkQueueTable';

import type {
  WorkQueueFilter,
  WorkQueueItem,
  WorkQueueStats,
  WorkQueueTaskType,
  WorkQueueUrgency,
} from '../work-queue.types';

import './WorkQueuePage.css';

const EMPTY_STATS:
  WorkQueueStats = {
    total: 0,
    pending: 0,
    overdue: 0,
    gate: 0,
    yard: 0,
    billing: 0,
    handover: 0,
  };

const urgencyOptions:
  Array<{
    value:
      | 'ALL'
      | WorkQueueUrgency;
    label: string;
  }> = [
    {
      value: 'ALL',
      label: 'Tất cả độ khẩn',
    },
    {
      value: 'OVERDUE',
      label: 'Quá hạn',
    },
    {
      value: 'HIGH',
      label: 'Cao',
    },
    {
      value: 'MEDIUM',
      label: 'Trung bình',
    },
    {
      value: 'NORMAL',
      label: 'Bình thường',
    },
  ];

const typeOptions:
  Array<{
    value:
      | 'ALL'
      | WorkQueueTaskType;
    label: string;
  }> = [
    {
      value: 'ALL',
      label: 'Tất cả nghiệp vụ',
    },
    {
      value: 'GATE_IN',
      label: 'Gate-in',
    },
    {
      value: 'YARD_ASSIGN',
      label: 'Xếp vị trí bãi',
    },
    {
      value:
        'YARD_OPERATIONS',
      label: 'Nghiệp vụ bãi',
    },
    {
      value: 'INSPECTION',
      label: 'Inspection',
    },
    {
      value: 'BILLING',
      label: 'Billing',
    },
    {
      value: 'GATE_OUT',
      label: 'Gate-out',
    },
    {
      value:
        'HANDOVER_REVIEW',
      label:
        'Handover Review',
    },
  ];

function getErrorMessage(
  error: unknown,
): string {
  if (
    typeof error ===
      'object' &&
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
      return body.error
        .message;
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

  return 'Không thể tải Work Queue.';
}

function includesSearch(
  item: WorkQueueItem,
  search: string,
): boolean {
  if (!search) {
    return true;
  }

  const needle =
    search
      .trim()
      .toUpperCase();

  return [
    item.title,
    item.description,
    item.containerNumber,
    item.vehiclePlate,
    item.entityId,
    item.visitId,
  ].some(
    (value) =>
      value
        ?.toUpperCase()
        .includes(
          needle,
        ) ?? false,
  );
}

function buildTaskPath(
  item: WorkQueueItem,
): string {
  const visitId =
    item.visitId;

  switch (item.type) {
    case 'GATE_IN': {
      return visitId
        ? `/gate-in?visitId=${encodeURIComponent(
            visitId,
          )}`
        : '/gate-in';
    }

    case 'YARD_ASSIGN': {
      return visitId
        ? `/yard/assign?visitId=${encodeURIComponent(
            visitId,
          )}`
        : '/yard';
    }

    case 'YARD_OPERATIONS':
    case 'INSPECTION': {
      return visitId
        ? `/yard/${encodeURIComponent(
            visitId,
          )}/operations`
        : '/yard';
    }

    case 'BILLING': {
      return visitId
        ? `/billing?visitId=${encodeURIComponent(
            visitId,
          )}`
        : '/billing';
    }

    case 'GATE_OUT': {
      return visitId
        ? `/gate-pass/${encodeURIComponent(
            visitId,
          )}`
        : '/gate-out';
    }

    case 'HANDOVER_REVIEW': {
      if (
        item.entityId
      ) {
        return `/handovers/${encodeURIComponent(
          item.entityId,
        )}`;
      }

      return '/handovers';
    }

    default: {
      if (
        item.containerNumber
      ) {
        return `/containers?search=${encodeURIComponent(
          item.containerNumber,
        )}`;
      }

      return '/';
    }
  }
}

export function WorkQueuePage() {
  const navigate =
    useNavigate();

  const [
    items,
    setItems,
  ] =
    useState<
      WorkQueueItem[]
    >([]);

  const [
    stats,
    setStats,
  ] =
    useState<
      WorkQueueStats
    >(EMPTY_STATS);

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

  const [
    updatedAt,
    setUpdatedAt,
  ] =
    useState<
      Date | null
    >(null);

  const [
    filter,
    setFilter,
  ] =
    useState<WorkQueueFilter>(
      {
        search: '',
        urgency: 'ALL',
        type: 'ALL',
      },
    );

  const loadQueue =
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

          const snapshot =
            await workQueueApi.getSnapshot();

          setItems(
            snapshot.items,
          );

          setStats(
            snapshot.stats,
          );

          setUpdatedAt(
            new Date(),
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
    void loadQueue();
  }, [loadQueue]);

  const filteredItems =
    useMemo(() => {
      const result =
        items.filter(
          (item) => {
            if (
              !includesSearch(
                item,
                filter.search,
              )
            ) {
              return false;
            }

            if (
              filter.urgency !==
                'ALL' &&
              item.urgency !==
                filter.urgency
            ) {
              return false;
            }

            if (
              filter.type !==
                'ALL' &&
              item.type !==
                filter.type
            ) {
              return false;
            }

            return true;
          },
        );

      const urgencyOrder:
        Record<
          WorkQueueUrgency,
          number
        > = {
          OVERDUE: 0,
          HIGH: 1,
          MEDIUM: 2,
          NORMAL: 3,
        };

      return result.sort(
        (left, right) => {
          const urgencyDiff =
            urgencyOrder[
              left.urgency
            ] -
            urgencyOrder[
              right.urgency
            ];

          if (
            urgencyDiff !==
            0
          ) {
            return urgencyDiff;
          }

          const leftDue =
            left.dueAt
              ? Date.parse(
                  left.dueAt,
                )
              : Infinity;

          const rightDue =
            right.dueAt
              ? Date.parse(
                  right.dueAt,
                )
              : Infinity;

          return (
            leftDue -
            rightDue
          );
        },
      );
    }, [
      items,
      filter,
    ]);

  function openTask(
    item: WorkQueueItem,
  ) {
    navigate(
      buildTaskPath(item),
    );
  }

  if (
    loading &&
    items.length === 0
  ) {
    return (
      <div className="work-queue-state">
        <div className="work-queue-state__spinner" />

        <strong>
          Đang tải Work Queue
        </strong>

        <span>
          Đang tổng hợp công
          việc cần xử lý...
        </span>
      </div>
    );
  }

  if (
    error &&
    items.length === 0
  ) {
    return (
      <div className="work-queue-state">
        <div className="work-queue-state__error">
          !
        </div>

        <strong>
          Không thể tải Work
          Queue
        </strong>

        <span>
          {error}
        </span>

        <button
          type="button"
          onClick={() => {
            void loadQueue();
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="work-queue-page">
      <div className="work-queue-toolbar">
        <div>
          <h2>
            Công việc vận hành
          </h2>

          <p>
            Công việc được sắp
            xếp theo SLA và độ
            ưu tiên.
          </p>
        </div>

        <div className="work-queue-toolbar__actions">
          {updatedAt && (
            <span>
              Cập nhật{' '}
              {updatedAt.toLocaleTimeString(
                'vi-VN',
                {
                  hour:
                    '2-digit',
                  minute:
                    '2-digit',
                },
              )}
            </span>
          )}

          <button
            type="button"
            disabled={refreshing}
            onClick={() => {
              void loadQueue(
                true,
              );
            }}
          >
            <b
              className={
                refreshing
                  ? 'work-queue-refresh-icon work-queue-refresh-icon--spinning'
                  : 'work-queue-refresh-icon'
              }
            >
              ↻
            </b>

            {refreshing
              ? 'Đang tải'
              : 'Làm mới'}
          </button>
        </div>
      </div>

      {error && (
        <div className="work-queue-inline-error">
          <strong>!</strong>

          <span>
            {error}
          </span>
        </div>
      )}

      <section className="work-queue-stats">
        <article>
          <span>
            CHỜ XỬ LÝ
          </span>

          <strong>
            {stats.pending}
          </strong>

          <small>
            Tổng công việc
            đang mở
          </small>
        </article>

        <article className="work-queue-stat--danger">
          <span>
            QUÁ HẠN
          </span>

          <strong>
            {stats.overdue}
          </strong>

          <small>
            Cần ưu tiên xử lý
          </small>
        </article>

        <article>
          <span>
            CỔNG
          </span>

          <strong>
            {stats.gate}
          </strong>

          <small>
            Gate-in /
            Gate-out
          </small>
        </article>

        <article>
          <span>
            BÃI
          </span>

          <strong>
            {stats.yard}
          </strong>

          <small>
            Xếp vị trí /
            nghiệp vụ
          </small>
        </article>
      </section>

      <section className="work-queue-panel">
        <div className="work-queue-filters">
          <div className="work-queue-search">
            <span>
              ⌕
            </span>

            <input
              type="search"
              placeholder="Tìm container, biển số xe, công việc..."
              value={
                filter.search
              }
              onChange={(
                event,
              ) =>
                setFilter(
                  (current) => ({
                    ...current,
                    search:
                      event
                        .target
                        .value,
                  }),
                )
              }
            />
          </div>

          <select
            value={
              filter.urgency
            }
            onChange={(
              event,
            ) =>
              setFilter(
                (current) => ({
                  ...current,
                  urgency:
                    event
                      .target
                      .value as
                      WorkQueueFilter['urgency'],
                }),
              )
            }
          >
            {urgencyOptions.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </option>
              ),
            )}
          </select>

          <select
            value={
              filter.type
            }
            onChange={(
              event,
            ) =>
              setFilter(
                (current) => ({
                  ...current,
                  type:
                    event
                      .target
                      .value as
                      WorkQueueFilter['type'],
                }),
              )
            }
          >
            {typeOptions.map(
              (option) => (
                <option
                  key={
                    option.value
                  }
                  value={
                    option.value
                  }
                >
                  {
                    option.label
                  }
                </option>
              ),
            )}
          </select>

          <div className="work-queue-result-count">
            {
              filteredItems.length
            }{' '}
            / {items.length}
            {' '}công việc
          </div>
        </div>

        {filteredItems.length >
        0 ? (
          <WorkQueueTable
            items={
              filteredItems
            }
            onOpen={
              openTask
            }
          />
        ) : (
          <div className="work-queue-empty">
            <div>
              ✓
            </div>

            <strong>
              Không có công
              việc phù hợp
            </strong>

            <span>
              Thử thay đổi bộ
              lọc hoặc làm mới
              dữ liệu.
            </span>
          </div>
        )}
      </section>
    </div>
  );
}

export default WorkQueuePage;
