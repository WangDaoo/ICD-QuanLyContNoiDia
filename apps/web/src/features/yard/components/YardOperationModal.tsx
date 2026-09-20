import {
  FormEvent,
  useEffect,
  useState,
} from 'react';

import {
  YardSlotGrid,
} from './YardSlotGrid';

import type {
  InspectionResult,
  YardBookingType,
  YardInspection,
  YardMovement,
} from '../yard-operation.types';

import type {
  YardSlot,
} from '../yard.types';

export type YardOperationModalState =
  | {
      type:
        'CREATE_MOVEMENT';
    }
  | {
      type:
        'COMPLETE_MOVEMENT';

      movement:
        YardMovement;
    }
  | {
      type:
        'CREATE_INSPECTION';
    }
  | {
      type:
        'COMPLETE_INSPECTION';

      inspection:
        YardInspection;
    }
  | {
      type:
        'CREATE_BOOKING';
    };

export type YardOperationModalSubmit =
  | {
      type:
        'CREATE_MOVEMENT';

      targetSlotId: string;

      notes?: string;
    }
  | {
      type:
        'COMPLETE_MOVEMENT';

      notes?: string;
    }
  | {
      type:
        'CREATE_INSPECTION';

      inspectionType: string;

      notes?: string;
    }
  | {
      type:
        'COMPLETE_INSPECTION';

      result:
        InspectionResult;

      notes?: string;
    }
  | {
      type:
        'CREATE_BOOKING';

      bookingType:
        YardBookingType;

      scheduledAt: string;

      notes?: string;
    };

type YardOperationModalProps = {
  state:
    YardOperationModalState;

  slots: YardSlot[];

  busy: boolean;

  onClose: () => void;

  onSubmit: (
    input:
      YardOperationModalSubmit,
  ) => Promise<void>;
};

export function YardOperationModal({
  state,
  slots,
  busy,
  onClose,
  onSubmit,
}: YardOperationModalProps) {
  const [
    selectedSlot,
    setSelectedSlot,
  ] =
    useState<
      YardSlot | null
    >(null);

  const [
    notes,
    setNotes,
  ] = useState('');

  const [
    inspectionType,
    setInspectionType,
  ] =
    useState('CUSTOMS');

  const [
    inspectionResult,
    setInspectionResult,
  ] =
    useState<InspectionResult>(
      'PASS',
    );

  const [
    bookingType,
    setBookingType,
  ] =
    useState<YardBookingType>(
      'STRIPPING',
    );

  const [
    scheduledAt,
    setScheduledAt,
  ] = useState('');

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  useEffect(() => {
    setSelectedSlot(null);
    setNotes('');
    setError(null);
  }, [state.type]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError(null);

    switch (state.type) {
      case 'CREATE_MOVEMENT': {
        if (!selectedSlot) {
          setError(
            'Vui lòng chọn vị trí đích.',
          );

          return;
        }

        await onSubmit({
          type:
            'CREATE_MOVEMENT',

          targetSlotId:
            selectedSlot.id,

          notes:
            notes.trim() ||
            undefined,
        });

        return;
      }

      case 'COMPLETE_MOVEMENT': {
        await onSubmit({
          type:
            'COMPLETE_MOVEMENT',

          notes:
            notes.trim() ||
            undefined,
        });

        return;
      }

      case 'CREATE_INSPECTION': {
        if (
          !inspectionType.trim()
        ) {
          setError(
            'Vui lòng chọn loại Inspection.',
          );

          return;
        }

        await onSubmit({
          type:
            'CREATE_INSPECTION',

          inspectionType:
            inspectionType.trim(),

          notes:
            notes.trim() ||
            undefined,
        });

        return;
      }

      case 'COMPLETE_INSPECTION': {
        if (
          (
            inspectionResult ===
              'FAIL' ||
            inspectionResult ===
              'HOLD'
          ) &&
          !notes.trim()
        ) {
          setError(
            'FAIL hoặc HOLD bắt buộc phải có ghi chú.',
          );

          return;
        }

        await onSubmit({
          type:
            'COMPLETE_INSPECTION',

          result:
            inspectionResult,

          notes:
            notes.trim() ||
            undefined,
        });

        return;
      }

      case 'CREATE_BOOKING': {
        if (!scheduledAt) {
          setError(
            'Vui lòng chọn thời gian booking.',
          );

          return;
        }

        await onSubmit({
          type:
            'CREATE_BOOKING',

          bookingType,

          scheduledAt:
            new Date(
              scheduledAt,
            ).toISOString(),

          notes:
            notes.trim() ||
            undefined,
        });
      }
    }
  }

  function getTitle() {
    switch (state.type) {
      case 'CREATE_MOVEMENT':
        return 'Tạo Internal Movement';

      case 'COMPLETE_MOVEMENT':
        return 'Hoàn tất Movement';

      case 'CREATE_INSPECTION':
        return 'Tạo Inspection';

      case 'COMPLETE_INSPECTION':
        return 'Hoàn tất Inspection';

      case 'CREATE_BOOKING':
        return 'Tạo Yard Booking';
    }
  }

  return (
    <div
      className="yard-operation-modal-backdrop"
      role="presentation"
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
            event.currentTarget &&
          !busy
        ) {
          onClose();
        }
      }}
    >
      <form
        className="yard-operation-modal"
        onSubmit={(event) => {
          void handleSubmit(
            event,
          );
        }}
      >
        <div className="yard-operation-modal__heading">
          <div>
            <span>
              YARD OPERATIONS
            </span>

            <h3>
              {getTitle()}
            </h3>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {state.type ===
          'CREATE_MOVEMENT' && (
          <>
            <div className="yard-operation-modal__label">
              Chọn vị trí đích
            </div>

            <div className="yard-operation-modal__slot-grid">
              <YardSlotGrid
                slots={slots}
                selectable
                selectedSlotId={
                  selectedSlot?.id
                }
                onSelect={
                  setSelectedSlot
                }
              />
            </div>

            {selectedSlot && (
              <div className="yard-operation-modal__selected">
                <span>
                  VỊ TRÍ ĐÍCH
                </span>

                <strong>
                  {
                    selectedSlot.label
                  }
                </strong>
              </div>
            )}
          </>
        )}

        {state.type ===
          'COMPLETE_MOVEMENT' && (
          <div className="yard-operation-modal__route">
            <div>
              <span>
                TỪ
              </span>

              <strong>
                {state.movement
                  .fromSlot
                  ?.label ??
                  'Vị trí cũ'}
              </strong>
            </div>

            <b>→</b>

            <div>
              <span>
                ĐẾN
              </span>

              <strong>
                {state.movement
                  .toSlot
                  ?.label ??
                  '—'}
              </strong>
            </div>
          </div>
        )}

        {state.type ===
          'CREATE_INSPECTION' && (
          <label className="yard-operation-modal__field">
            <span>
              Loại Inspection
            </span>

            <select
              value={
                inspectionType
              }
              disabled={busy}
              onChange={(
                event,
              ) =>
                setInspectionType(
                  event.target
                    .value,
                )
              }
            >
              <option value="CUSTOMS">
                Hải quan
              </option>

              <option value="DAMAGE">
                Hư hỏng
              </option>

              <option value="SECURITY">
                An ninh
              </option>

              <option value="GENERAL">
                Kiểm tra chung
              </option>
            </select>
          </label>
        )}

        {state.type ===
          'COMPLETE_INSPECTION' && (
          <div className="yard-inspection-result-picker">
            {(
              [
                'PASS',
                'FAIL',
                'HOLD',
              ] as
                InspectionResult[]
            ).map(
              (result) => (
                <button
                  key={result}
                  type="button"
                  disabled={busy}
                  className={
                    inspectionResult ===
                    result
                      ? `yard-inspection-choice yard-inspection-choice--${result.toLowerCase()} yard-inspection-choice--selected`
                      : `yard-inspection-choice yard-inspection-choice--${result.toLowerCase()}`
                  }
                  onClick={() =>
                    setInspectionResult(
                      result,
                    )
                  }
                >
                  {result}
                </button>
              ),
            )}
          </div>
        )}

        {state.type ===
          'CREATE_BOOKING' && (
          <div className="yard-operation-modal__fields">
            <label className="yard-operation-modal__field">
              <span>
                Loại Booking
              </span>

              <select
                value={
                  bookingType
                }
                disabled={busy}
                onChange={(
                  event,
                ) =>
                  setBookingType(
                    event.target
                      .value as
                      YardBookingType,
                  )
                }
              >
                <option value="STRIPPING">
                  Stripping
                </option>

                <option value="STUFFING">
                  Stuffing
                </option>

                <option value="INSPECTION">
                  Inspection Booking
                </option>
              </select>
            </label>

            <label className="yard-operation-modal__field">
              <span>
                Lịch thực hiện
              </span>

              <input
                type="datetime-local"
                value={
                  scheduledAt
                }
                disabled={busy}
                onChange={(
                  event,
                ) =>
                  setScheduledAt(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>
        )}

        <label className="yard-operation-modal__field">
          <span>
            Ghi chú
            {state.type ===
              'COMPLETE_INSPECTION' &&
              (
                inspectionResult ===
                  'FAIL' ||
                inspectionResult ===
                  'HOLD'
              ) &&
              ' *'}
          </span>

          <textarea
            rows={4}
            value={notes}
            disabled={busy}
            placeholder="Nhập ghi chú nghiệp vụ..."
            onChange={(
              event,
            ) =>
              setNotes(
                event.target
                  .value,
              )
            }
          />
        </label>

        {error && (
          <div className="yard-operation-modal__error">
            <strong>!</strong>

            {error}
          </div>
        )}

        <div className="yard-operation-modal__actions">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Hủy
          </button>

          <button
            type="submit"
            className="yard-operation-modal__submit"
            disabled={busy}
          >
            {busy
              ? 'Đang xử lý...'
              : 'Xác nhận'}
          </button>
        </div>
      </form>
    </div>
  );
}
