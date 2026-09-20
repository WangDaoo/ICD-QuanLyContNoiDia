import type {
  YardOperation,
} from '../yard-operation.types';

type YardOperationCardProps = {
  operation: YardOperation;

  busy?: boolean;

  onStart: (
    operation: YardOperation,
  ) => void;

  onComplete: (
    operation: YardOperation,
  ) => void;
};

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
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
}

function getTitle(
  operation: YardOperation,
): string {
  switch (
    operation.operationType
  ) {
    case 'MOVEMENT':
      return 'Internal Movement';

    case 'INSPECTION':
      return `Inspection${
        operation.inspectionType
          ? ` · ${operation.inspectionType}`
          : ''
      }`;

    case 'BOOKING':
      return `${operation.bookingType} Booking`;
  }
}

function getIcon(
  operation: YardOperation,
): string {
  switch (
    operation.operationType
  ) {
    case 'MOVEMENT':
      return '⇄';

    case 'INSPECTION':
      return '◎';

    case 'BOOKING':
      return '▤';
  }
}

function getStatusTone(
  status: string,
): string {
  switch (
    status.toUpperCase()
  ) {
    case 'COMPLETED':
      return 'completed';

    case 'IN_PROGRESS':
      return 'progress';

    case 'CANCELLED':
      return 'cancelled';

    default:
      return 'pending';
  }
}

export function YardOperationCard({
  operation,
  busy = false,
  onStart,
  onComplete,
}: YardOperationCardProps) {
  return (
    <article className="yard-operation-card">
      <div className="yard-operation-card__icon">
        {getIcon(
          operation,
        )}
      </div>

      <div className="yard-operation-card__body">
        <div className="yard-operation-card__heading">
          <div>
            <span
              className={[
                'yard-operation-status',
                `yard-operation-status--${getStatusTone(
                  operation.status,
                )}`,
              ].join(' ')}
            >
              {
                operation.status
              }
            </span>

            <h3>
              {getTitle(
                operation,
              )}
            </h3>
          </div>

          <small>
            {formatDateTime(
              operation.createdAt,
            )}
          </small>
        </div>

        {operation.operationType ===
          'MOVEMENT' && (
          <div className="yard-operation-movement-route">
            <div>
              <span>
                TỪ
              </span>

              <strong>
                {operation
                  .fromSlot
                  ?.label ??
                  'Vị trí hiện tại'}
              </strong>
            </div>

            <b>→</b>

            <div>
              <span>
                ĐẾN
              </span>

              <strong>
                {operation
                  .toSlot
                  ?.label ??
                  '—'}
              </strong>
            </div>
          </div>
        )}

        {operation.operationType ===
          'INSPECTION' &&
          operation.result && (
          <div
            className={[
              'yard-inspection-result',
              `yard-inspection-result--${operation.result.toLowerCase()}`,
            ].join(' ')}
          >
            Kết quả:{' '}
            <strong>
              {operation.result}
            </strong>
          </div>
        )}

        {operation.operationType ===
          'BOOKING' && (
          <div className="yard-operation-booking-time">
            <span>
              Lịch:
            </span>

            <strong>
              {formatDateTime(
                operation.scheduledAt,
              )}
            </strong>
          </div>
        )}

        {operation.notes && (
          <p className="yard-operation-card__notes">
            {operation.notes}
          </p>
        )}

        <div className="yard-operation-card__timestamps">
          {operation.startedAt && (
            <span>
              Bắt đầu:{' '}
              {formatDateTime(
                operation.startedAt,
              )}
            </span>
          )}

          {operation.completedAt && (
            <span>
              Hoàn tất:{' '}
              {formatDateTime(
                operation.completedAt,
              )}
            </span>
          )}
        </div>
      </div>

      <div className="yard-operation-card__actions">
        {operation.operationType !==
          'BOOKING' &&
          operation.status ===
            'PENDING' && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                onStart(
                  operation,
                )
              }
            >
              Bắt đầu
            </button>
          )}

        {operation.operationType !==
          'BOOKING' &&
          operation.status ===
            'IN_PROGRESS' && (
            <button
              type="button"
              className="yard-operation-card__complete"
              disabled={busy}
              onClick={() =>
                onComplete(
                  operation,
                )
              }
            >
              Hoàn tất
            </button>
          )}

        {operation.operationType ===
          'BOOKING' && (
          <span className="yard-operation-card__readonly">
            Read-only
          </span>
        )}
      </div>
    </article>
  );
}
