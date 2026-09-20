import type {
  WorkQueueItem,
  WorkQueueUrgency,
} from '../work-queue.types';

type WorkQueueTableProps = {
  items: WorkQueueItem[];

  onOpen:
    (
      item: WorkQueueItem,
    ) => void;
};

const urgencyLabels:
  Record<
    WorkQueueUrgency,
    string
  > = {
    OVERDUE: 'QUÁ HẠN',
    HIGH: 'CAO',
    MEDIUM: 'TRUNG BÌNH',
    NORMAL: 'BÌNH THƯỜNG',
  };

function formatDateTime(
  value?: string,
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
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
}

function calculateWaitingMinutes(
  item: WorkQueueItem,
): number | undefined {
  if (
    item.waitingMinutes !==
    undefined
  ) {
    return Math.max(
      0,
      Math.round(
        item.waitingMinutes,
      ),
    );
  }

  if (!item.createdAt) {
    return undefined;
  }

  const created =
    Date.parse(
      item.createdAt,
    );

  if (
    !Number.isFinite(
      created,
    )
  ) {
    return undefined;
  }

  return Math.max(
    0,
    Math.floor(
      (Date.now() -
        created) /
        60_000,
    ),
  );
}

function formatWaitingTime(
  item: WorkQueueItem,
): string {
  const minutes =
    calculateWaitingMinutes(
      item,
    );

  if (
    minutes === undefined
  ) {
    return '—';
  }

  if (minutes < 60) {
    return `${minutes} phút`;
  }

  const hours =
    Math.floor(
      minutes / 60,
    );

  const remainder =
    minutes % 60;

  if (
    hours < 24
  ) {
    return remainder
      ? `${hours} giờ ${remainder} phút`
      : `${hours} giờ`;
  }

  const days =
    Math.floor(
      hours / 24,
    );

  return `${days} ngày`;
}

function getTaskTypeLabel(
  item: WorkQueueItem,
): string {
  switch (item.type) {
    case 'GATE_IN':
      return 'GATE-IN';

    case 'YARD_ASSIGN':
      return 'YARD ASSIGN';

    case 'YARD_OPERATIONS':
      return 'YARD';

    case 'INSPECTION':
      return 'INSPECTION';

    case 'BILLING':
      return 'BILLING';

    case 'GATE_OUT':
      return 'GATE-OUT';

    case 'HANDOVER_REVIEW':
      return 'HANDOVER';

    default:
      return 'OPERATIONS';
  }
}

export function WorkQueueTable({
  items,
  onOpen,
}: WorkQueueTableProps) {
  return (
    <div className="work-queue-table-wrapper">
      <table className="work-queue-table">
        <thead>
          <tr>
            <th>
              ĐỘ KHẨN
            </th>

            <th>
              CÔNG VIỆC
            </th>

            <th>
              CONTAINER
            </th>

            <th>
              XE
            </th>

            <th>
              CHỜ
            </th>

            <th>
              DEADLINE
            </th>

            <th
              aria-label="Tác vụ"
            />
          </tr>
        </thead>

        <tbody>
          {items.map(
            (item) => (
              <tr
                key={item.id}
                className={
                  item.urgency ===
                  'OVERDUE'
                    ? 'work-queue-table__row work-queue-table__row--overdue'
                    : 'work-queue-table__row'
                }
                onDoubleClick={() =>
                  onOpen(item)
                }
              >
                <td>
                  <span
                    className={[
                      'work-queue-urgency',
                      `work-queue-urgency--${item.urgency.toLowerCase()}`,
                    ].join(
                      ' ',
                    )}
                  >
                    {
                      urgencyLabels[
                        item
                          .urgency
                      ]
                    }
                  </span>
                </td>

                <td>
                  <div className="work-queue-task">
                    <span className="work-queue-task__type">
                      {getTaskTypeLabel(
                        item,
                      )}
                    </span>

                    <strong>
                      {item.title}
                    </strong>

                    {item.description && (
                      <small>
                        {
                          item.description
                        }
                      </small>
                    )}
                  </div>
                </td>

                <td>
                  {item.containerNumber ? (
                    <span className="work-queue-container-number">
                      {
                        item.containerNumber
                      }
                    </span>
                  ) : (
                    <span className="work-queue-muted">
                      —
                    </span>
                  )}
                </td>

                <td>
                  <span className="work-queue-vehicle">
                    {item.vehiclePlate ??
                      '—'}
                  </span>
                </td>

                <td>
                  <span className="work-queue-waiting">
                    {formatWaitingTime(
                      item,
                    )}
                  </span>
                </td>

                <td>
                  <span
                    className={
                      item.urgency ===
                      'OVERDUE'
                        ? 'work-queue-deadline work-queue-deadline--overdue'
                        : 'work-queue-deadline'
                    }
                  >
                    {formatDateTime(
                      item.dueAt,
                    )}
                  </span>
                </td>

                <td>
                  <button
                    type="button"
                    className="work-queue-open-button"
                    onClick={() =>
                      onOpen(
                        item,
                      )
                    }
                  >
                    Thực hiện
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
  );
}
