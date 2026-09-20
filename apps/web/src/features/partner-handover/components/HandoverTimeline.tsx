import type {
  TransportHandover,
} from '../handover.types';

type HandoverTimelineProps = {
  handover:
    TransportHandover;
};

const MAIN_STEPS = [
  {
    status:
      'READY_FOR_HANDOVER',

    label:
      'Sẵn sàng bàn giao',

    timestamp:
      'readyAt',
  },
  {
    status:
      'PARTNER_ACCEPTED',

    label:
      'Partner đã nhận',

    timestamp:
      'partnerAcceptedAt',
  },
  {
    status:
      'IN_TRANSIT',

    label:
      'Đang vận chuyển',

    timestamp:
      'departedAt',
  },
  {
    status:
      'PARTNER_CONFIRMED',

    label:
      'Kho Partner đã nhận',

    timestamp:
      'partnerConfirmedAt',
  },
  {
    status:
      'ICD_CONFIRMED',

    label:
      'ICD xác nhận',

    timestamp:
      'icdConfirmedAt',
  },
  {
    status:
      'COMPLETED',

    label:
      'Hoàn tất',

    timestamp:
      'completedAt',
  },
] as const;

const ORDER = [
  'DRAFT',
  'READY_FOR_HANDOVER',
  'PARTNER_ACCEPTED',
  'IN_TRANSIT',
  'PARTNER_CONFIRMED',
  'ICD_CONFIRMED',
  'COMPLETED',
];

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

  return date.toLocaleString(
    'vi-VN',
  );
}

export function HandoverTimeline({
  handover,
}: HandoverTimelineProps) {
  const currentIndex =
    ORDER.indexOf(
      handover.status,
    );

  const exceptional =
    [
      'PARTNER_REJECTED',
      'DELIVERY_FAILED',
      'DISPUTED',
      'CANCELLED',
    ].includes(
      handover.status,
    );

  return (
    <div className="handover-timeline">
      {handover.status ===
        'DRAFT' && (
        <article className="handover-timeline__step handover-timeline__step--active">
          <span>✓</span>

          <div>
            <strong>
              Bản nháp
            </strong>

            <small>
              {formatDateTime(
                handover.createdAt,
              )}
            </small>
          </div>
        </article>
      )}

      {MAIN_STEPS.map(
        (
          step,
        ) => {
          const stepIndex =
            ORDER.indexOf(
              step.status,
            );

          const completed =
            !exceptional &&
            currentIndex >=
              stepIndex;

          const timestamp =
            handover[
              step.timestamp
            ];

          return (
            <article
              key={
                step.status
              }
              className={
                completed
                  ? 'handover-timeline__step handover-timeline__step--active'
                  : 'handover-timeline__step'
              }
            >
              <span>
                {completed
                  ? '✓'
                  : ''}
              </span>

              <div>
                <strong>
                  {
                    step.label
                  }
                </strong>

                <small>
                  {formatDateTime(
                    timestamp,
                  )}
                </small>
              </div>
            </article>
          );
        },
      )}

      {exceptional && (
        <article className="handover-timeline__exception">
          <strong>
            {
              handover.status
            }
          </strong>

          <span>
            Lifecycle Handover
            đang ở nhánh ngoại lệ.
            Container Visit không
            bị rollback.
          </span>
        </article>
      )}
    </div>
  );
}

export default HandoverTimeline;
