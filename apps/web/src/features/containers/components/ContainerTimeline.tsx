import type {
  ContainerTimelineEvent,
} from '../container.types';

type ContainerTimelineProps = {
  events: ContainerTimelineEvent[];
};

function formatDateTime(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
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

function getEventTone(
  type: string,
): string {
  const normalized =
    type.toUpperCase();

  if (
    normalized.includes(
      'GATE_OUT',
    ) ||
    normalized === 'EXITED'
  ) {
    return 'success';
  }

  if (
    normalized.includes(
      'HOLD',
    ) ||
    normalized.includes(
      'FAILED',
    )
  ) {
    return 'danger';
  }

  if (
    normalized.includes(
      'GATE',
    )
  ) {
    return 'primary';
  }

  if (
    normalized.includes(
      'YARD',
    )
  ) {
    return 'yard';
  }

  return 'neutral';
}

export function ContainerTimeline({
  events,
}: ContainerTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="container-timeline-empty">
        <span>◎</span>

        <strong>
          Chưa có sự kiện
        </strong>

        <small>
          Timeline sẽ xuất hiện khi
          container phát sinh nghiệp vụ.
        </small>
      </div>
    );
  }

  return (
    <div className="container-timeline">
      {events.map(
        (event) => (
          <article
            key={event.id}
            className="container-timeline__item"
          >
            <div
              className={[
                'container-timeline__marker',
                `container-timeline__marker--${getEventTone(
                  event.type,
                )}`,
              ].join(' ')}
            />

            <div className="container-timeline__content">
              <div className="container-timeline__heading">
                <strong>
                  {event.title}
                </strong>

                <time>
                  {formatDateTime(
                    event.createdAt,
                  )}
                </time>
              </div>

              {event.description && (
                <p>
                  {
                    event.description
                  }
                </p>
              )}

              {event.actorName && (
                <span className="container-timeline__actor">
                  Thực hiện bởi{' '}
                  <strong>
                    {
                      event.actorName
                    }
                  </strong>
                </span>
              )}
            </div>
          </article>
        ),
      )}
    </div>
  );
}
