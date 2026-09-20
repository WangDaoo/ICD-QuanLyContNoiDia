import {
  Link,
} from 'react-router-dom';

import type {
  YardSlot,
} from '../yard.types';

type YardSlotGridProps = {
  slots: YardSlot[];

  selectedSlotId?: string;

  selectable?: boolean;

  onSelect?: (
    slot: YardSlot,
  ) => void;
};

function getStatusLabel(
  slot: YardSlot,
): string {
  if (
    !slot.isOperational
  ) {
    return 'Bảo trì';
  }

  switch (
    slot.status.toUpperCase()
  ) {
    case 'AVAILABLE':
      return 'Trống';

    case 'OCCUPIED':
      return 'Có container';

    case 'MAINTENANCE':
      return 'Bảo trì';

    case 'BLOCKED':
      return 'Khóa';

    default:
      return slot.status;
  }
}

function getTone(
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

export function YardSlotGrid({
  slots,
  selectedSlotId,
  selectable = false,
  onSelect,
}: YardSlotGridProps) {
  const blocks =
    Array.from(
      new Set(
        slots.map(
          (slot) =>
            slot.block ||
            'UNASSIGNED',
        ),
      ),
    ).sort();

  if (
    slots.length === 0
  ) {
    return (
      <div className="yard-empty">
        <span>▦</span>

        <strong>
          Chưa có Yard Slot
        </strong>
      </div>
    );
  }

  return (
    <div className="yard-grid">
      {blocks.map(
        (block) => {
          const blockSlots =
            slots.filter(
              (slot) =>
                (
                  slot.block ||
                  'UNASSIGNED'
                ) === block,
            );

          return (
            <section
              key={block}
              className="yard-grid__block"
            >
              <div className="yard-grid__block-heading">
                <div>
                  <span>
                    BLOCK
                  </span>

                  <strong>
                    {block}
                  </strong>
                </div>

                <small>
                  {
                    blockSlots.length
                  }{' '}
                  slots
                </small>
              </div>

              <div className="yard-grid__slots">
                {blockSlots.map(
                  (slot) => {
                    const tone =
                      getTone(
                        slot,
                      );

                    const canSelect =
                      selectable &&
                      tone ===
                        'available';

                    return (
                      <button
                        key={
                          slot.id
                        }
                        type="button"
                        disabled={
                          selectable &&
                          !canSelect
                        }
                        className={[
                          'yard-grid-slot',
                          `yard-grid-slot--${tone}`,
                          selectedSlotId ===
                          slot.id
                            ? 'yard-grid-slot--selected'
                            : '',
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            ' ',
                          )}
                        onClick={() => {
                          if (
                            canSelect
                          ) {
                            onSelect?.(
                              slot,
                            );
                          }
                        }}
                      >
                        <div className="yard-grid-slot__position">
                          <strong>
                            {slot.row ||
                              'R-'}
                          </strong>

                          <span>
                            {slot.bay ||
                              'B-'}
                          </span>

                          <span>
                            {slot.tier ||
                              'T-'}
                          </span>
                        </div>

                        <small>
                          {getStatusLabel(
                            slot,
                          )}
                        </small>

                        {slot.currentContainer
                          ?.containerNumber && (
                          <div className="yard-grid-slot__container">
                            {slot.currentContainer
                              .visitId ? (
                              <Link
                                to={`/containers/${encodeURIComponent(
                                  slot
                                    .currentContainer
                                    .visitId,
                                )}`}
                                onClick={(
                                  event,
                                ) =>
                                  event.stopPropagation()
                                }
                              >
                                {
                                  slot
                                    .currentContainer
                                    .containerNumber
                                }
                              </Link>
                            ) : (
                              <strong>
                                {
                                  slot
                                    .currentContainer
                                    .containerNumber
                                }
                              </strong>
                            )}
                          </div>
                        )}

                        {slot.reeferPower && (
                          <span className="yard-grid-slot__reefer">
                            ⚡
                          </span>
                        )}
                      </button>
                    );
                  },
                )}
              </div>
            </section>
          );
        },
      )}
    </div>
  );
}
