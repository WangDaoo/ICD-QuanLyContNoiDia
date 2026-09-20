import type {
  YardRecommendation,
} from '../yard.types';

type YardRecommendationListProps = {
  recommendations:
    YardRecommendation[];

  selectedSlotId?: string;

  disabled?: boolean;

  onSelect: (
    recommendation:
      YardRecommendation,
  ) => void;
};

function formatScore(
  value: number,
): string {
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(value),
    ),
  ).toString();
}

export function YardRecommendationList({
  recommendations,
  selectedSlotId,
  disabled = false,
  onSelect,
}: YardRecommendationListProps) {
  if (
    recommendations.length ===
    0
  ) {
    return (
      <div className="yard-recommendation-empty">
        <span>★</span>

        <strong>
          Không có recommendation
        </strong>

        <small>
          Có thể chọn slot thủ công
          bên dưới.
        </small>
      </div>
    );
  }

  return (
    <div className="yard-recommendations">
      {recommendations.map(
        (item) => (
          <article
            key={
              item.id ??
              `${item.slotId}-${item.rank}`
            }
            className={[
              'yard-recommendation',
              selectedSlotId ===
              item.slotId
                ? 'yard-recommendation--selected'
                : '',
            ]
              .filter(
                Boolean,
              )
              .join(' ')}
          >
            <div className="yard-recommendation__rank">
              #{item.rank}
            </div>

            <div className="yard-recommendation__main">
              <div className="yard-recommendation__position">
                <strong>
                  {
                    item.slot
                      .label
                  }
                </strong>

                <span>
                  {item.source ??
                    'RULE'}
                </span>
              </div>

              <div className="yard-recommendation__reasons">
                {item.reasons.length >
                0 ? (
                  item.reasons.map(
                    (
                      reason,
                      index,
                    ) => (
                      <span
                        key={`${item.slotId}-${index}`}
                      >
                        ✓ {reason}
                      </span>
                    ),
                  )
                ) : (
                  <span>
                    ✓ Đạt hard rules
                  </span>
                )}
              </div>

              <div className="yard-recommendation__slot-meta">
                <span>
                  Max:{' '}
                  {item.slot
                    .maxWeight
                    ? `${new Intl.NumberFormat(
                        'vi-VN',
                      ).format(
                        item.slot
                          .maxWeight,
                      )} kg`
                    : '—'}
                </span>

                <span>
                  Reefer:{' '}
                  {item.slot
                    .reeferPower
                    ? 'Có'
                    : 'Không'}
                </span>
              </div>
            </div>

            <div className="yard-recommendation__score">
              <span>
                SCORE
              </span>

              <strong>
                {formatScore(
                  item.score,
                )}
              </strong>
            </div>

            <button
              type="button"
              disabled={
                disabled
              }
              onClick={() =>
                onSelect(
                  item,
                )
              }
            >
              Chọn
            </button>
          </article>
        ),
      )}
    </div>
  );
}
