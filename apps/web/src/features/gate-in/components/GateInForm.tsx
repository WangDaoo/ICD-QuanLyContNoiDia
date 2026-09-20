import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  GateInCondition,
  GateInContext,
  GateInRequest,
} from '../gate-in.types';

type GateInFormProps = {
  context: GateInContext;

  submitting: boolean;

  onSubmit: (
    input: GateInRequest,
  ) => Promise<void>;
};

const CONDITION_OPTIONS:
  Array<{
    value: GateInCondition;
    label: string;
  }> = [
    {
      value: 'GOOD',
      label: 'Tốt / bình thường',
    },
    {
      value: 'DAMAGED',
      label: 'Có hư hỏng',
    },
    {
      value: 'DIRTY',
      label: 'Bẩn / cần vệ sinh',
    },
    {
      value: 'SEAL_BROKEN',
      label: 'Seal bị hỏng',
    },
  ];

export function GateInForm({
  context,
  submitting,
  onSubmit,
}: GateInFormProps) {
  const defaultTruckVisitId =
    context.currentTruckVisit
      ?.id ??
    context.availableTruckVisits[0]
      ?.id ??
    '';

  const [
    actualSeal,
    setActualSeal,
  ] = useState('');

  const [
    actualWeight,
    setActualWeight,
  ] = useState('');

  const [
    condition,
    setCondition,
  ] =
    useState<GateInCondition>(
      'GOOD',
    );

  const [
    notes,
    setNotes,
  ] = useState('');

  const [
    truckVisitId,
    setTruckVisitId,
  ] =
    useState(
      defaultTruckVisitId,
    );

  const [
    vehiclePlate,
    setVehiclePlate,
  ] = useState('');

  const [
    driverName,
    setDriverName,
  ] = useState('');

  const [
    transporterId,
    setTransporterId,
  ] = useState('');

  const [
    validationError,
    setValidationError,
  ] =
    useState<
      string | null
    >(null);

  const selectedTruckVisit =
    useMemo(
      () =>
        context.availableTruckVisits.find(
          (item) =>
            item.id ===
            truckVisitId,
        ) ??
        (
          context.currentTruckVisit
            ?.id ===
          truckVisitId
            ? context.currentTruckVisit
            : null
        ),
      [
        context,
        truckVisitId,
      ],
    );

  useEffect(() => {
    if (
      !selectedTruckVisit
    ) {
      return;
    }

    setVehiclePlate(
      selectedTruckVisit.vehiclePlate ??
        '',
    );

    setDriverName(
      selectedTruckVisit.driverName ??
        '',
    );

    setTransporterId(
      selectedTruckVisit.transporterId ??
        '',
    );
  }, [selectedTruckVisit]);

  const sealMismatch =
    useMemo(() => {
      if (
        !context.expectedSeal ||
        !actualSeal.trim()
      ) {
        return false;
      }

      return (
        context.expectedSeal
          .trim()
          .toUpperCase() !==
        actualSeal
          .trim()
          .toUpperCase()
      );
    }, [
      context.expectedSeal,
      actualSeal,
    ]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setValidationError(
      null,
    );

    if (!actualSeal.trim()) {
      setValidationError(
        'Vui lòng nhập seal thực tế.',
      );

      return;
    }

    if (
      actualWeight.trim()
    ) {
      const weight =
        Number(
          actualWeight,
        );

      if (
        !Number.isFinite(
          weight,
        ) ||
        weight <= 0
      ) {
        setValidationError(
          'Trọng lượng phải là số lớn hơn 0.',
        );

        return;
      }
    }

    if (
      sealMismatch &&
      !notes.trim()
    ) {
      setValidationError(
        'Seal thực tế khác seal Manifest. Vui lòng nhập ghi chú.',
      );

      return;
    }

    if (
      condition !==
        'GOOD' &&
      !notes.trim()
    ) {
      setValidationError(
        'Container có tình trạng bất thường. Vui lòng nhập ghi chú.',
      );

      return;
    }

    if (
      !truckVisitId &&
      !vehiclePlate.trim()
    ) {
      setValidationError(
        'Vui lòng nhập biển số xe cho Gate-in trực tiếp.',
      );

      return;
    }

    if (
      !truckVisitId &&
      !driverName.trim()
    ) {
      setValidationError(
        'Vui lòng nhập tên tài xế cho Gate-in trực tiếp.',
      );

      return;
    }

    await onSubmit({
      actualSeal:
        actualSeal.trim(),

      actualWeight:
        actualWeight.trim()
          ? Number(
              actualWeight,
            )
          : undefined,

      condition,

      notes:
        notes.trim() ||
        undefined,

      truckVisitId:
        truckVisitId ||
        undefined,

      vehiclePlate:
        !truckVisitId
          ? vehiclePlate
          : undefined,

      driverName:
        !truckVisitId
          ? driverName
          : undefined,

      transporterId:
        !truckVisitId &&
        transporterId.trim()
          ? transporterId
          : undefined,
    });
  }

  return (
    <form
      className="gate-in-form"
      onSubmit={(event) => {
        void handleSubmit(
          event,
        );
      }}
    >
      <section className="gate-in-card">
        <div className="gate-in-card__heading">
          <div>
            <span>
              CONTAINER
            </span>

            <h3>
              Thông tin container
            </h3>
          </div>

          <span className="gate-in-visit-status">
            {
              context.visitStatus
            }
          </span>
        </div>

        <div className="gate-in-info-grid">
          <div className="gate-in-info">
            <span>
              Container No.
            </span>

            <strong className="gate-in-container-number">
              {
                context.containerNumber
              }
            </strong>
          </div>

          <div className="gate-in-info">
            <span>
              Size / Type
            </span>

            <strong>
              {[
                context.size,
                context.type,
              ]
                .filter(
                  Boolean,
                )
                .join(
                  ' · ',
                ) || '—'}
            </strong>
          </div>

          <div className="gate-in-info">
            <span>
              ISO Code
            </span>

            <strong>
              {context.isoCode ??
                '—'}
            </strong>
          </div>

          <div className="gate-in-info">
            <span>
              Seal Manifest
            </span>

            <strong>
              {context.expectedSeal ??
                '—'}
            </strong>
          </div>

          <div className="gate-in-info">
            <span>
              Gross Weight
            </span>

            <strong>
              {context.grossWeight
                ? `${new Intl.NumberFormat(
                    'vi-VN',
                  ).format(
                    context.grossWeight,
                  )} kg`
                : '—'}
            </strong>
          </div>
        </div>
      </section>

      <section className="gate-in-card">
        <div className="gate-in-card__heading">
          <div>
            <span>
              MOVEMENT ORDER
            </span>

            <h3>
              Điều kiện vận chuyển
            </h3>
          </div>
        </div>

        {context.movementOrder ? (
          <div className="gate-in-movement-order">
            <div>
              <span>
                Order ID
              </span>

              <strong>
                {context.movementOrder
                  .id ??
                  '—'}
              </strong>
            </div>

            <div>
              <span>
                Status
              </span>

              <strong>
                {context.movementOrder
                  .status ??
                  '—'}
              </strong>
            </div>

            <div>
              <span>
                Expires
              </span>

              <strong>
                {context.movementOrder
                  .expiresAt
                  ? new Date(
                      context.movementOrder
                        .expiresAt,
                    ).toLocaleString(
                      'vi-VN',
                    )
                  : '—'}
              </strong>
            </div>
          </div>
        ) : (
          <div className="gate-in-info-banner">
            Backend sẽ xác thực
            Movement Order tại thời
            điểm Gate-in.
          </div>
        )}
      </section>

      <section className="gate-in-card">
        <div className="gate-in-card__heading">
          <div>
            <span>
              RECEPTION
            </span>

            <h3>
              Thông tin tiếp nhận
            </h3>
          </div>
        </div>

        <div className="gate-in-fields">
          <label>
            <span>
              Seal thực tế *
            </span>

            <input
              type="text"
              value={
                actualSeal
              }
              disabled={
                submitting
              }
              className={
                sealMismatch
                  ? 'gate-in-input--error'
                  : ''
              }
              placeholder="Nhập số seal thực tế"
              onChange={(
                event,
              ) => {
                setActualSeal(
                  event.target
                    .value
                    .toUpperCase(),
                );

                setValidationError(
                  null,
                );
              }}
            />

            {sealMismatch && (
              <small className="gate-in-field-warning">
                Seal khác Manifest:
                {' '}
                {context.expectedSeal}
              </small>
            )}
          </label>

          <label>
            <span>
              Trọng lượng vào
              (kg)
            </span>

            <input
              type="number"
              min="0"
              step="0.001"
              value={
                actualWeight
              }
              disabled={
                submitting
              }
              placeholder="Ví dụ: 28500"
              onChange={(
                event,
              ) =>
                setActualWeight(
                  event.target
                    .value,
                )
              }
            />
          </label>

          <label>
            <span>
              Tình trạng
            </span>

            <select
              value={
                condition
              }
              disabled={
                submitting
              }
              onChange={(
                event,
              ) =>
                setCondition(
                  event.target
                    .value as
                    GateInCondition,
                )
              }
            >
              {CONDITION_OPTIONS.map(
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
          </label>

          <label className="gate-in-field--full">
            <span>
              Ghi chú
              {(sealMismatch ||
                condition !==
                  'GOOD') &&
                ' *'}
            </span>

            <textarea
              rows={4}
              value={notes}
              disabled={
                submitting
              }
              placeholder={
                sealMismatch
                  ? 'Bắt buộc mô tả chênh lệch seal...'
                  : 'Mô tả tình trạng bất thường nếu có...'
              }
              onChange={(
                event,
              ) => {
                setNotes(
                  event.target
                    .value,
                );

                setValidationError(
                  null,
                );
              }}
            />
          </label>
        </div>
      </section>

      <section className="gate-in-card">
        <div className="gate-in-card__heading">
          <div>
            <span>
              TRUCK
            </span>

            <h3>
              Thông tin xe
            </h3>
          </div>
        </div>

        <div className="gate-in-fields">
          <label className="gate-in-field--full">
            <span>
              Truck Visit
            </span>

            <select
              value={
                truckVisitId
              }
              disabled={
                submitting
              }
              onChange={(
                event,
              ) => {
                setTruckVisitId(
                  event.target
                    .value,
                );

                setValidationError(
                  null,
                );
              }}
            >
              <option value="">
                Gate-in trực tiếp /
                Walk-in
              </option>

              {context.availableTruckVisits.map(
                (truckVisit) => (
                  <option
                    key={
                      truckVisit.id
                    }
                    value={
                      truckVisit.id
                    }
                  >
                    {[
                      truckVisit.visitNumber,
                      truckVisit.vehiclePlate,
                      truckVisit.driverName,
                    ]
                      .filter(
                        Boolean,
                      )
                      .join(
                        ' · ',
                      )}
                  </option>
                ),
              )}
            </select>

            {context.availableTruckVisits
              .length === 0 && (
              <small>
                Không có Truck Visit
                ARRIVED liên kết với
                container. Có thể sử
                dụng workflow Gate-in
                trực tiếp nếu backend
                cho phép.
              </small>
            )}
          </label>

          <label>
            <span>
              Biển số xe
              {!truckVisitId &&
                ' *'}
            </span>

            <input
              type="text"
              value={
                vehiclePlate
              }
              readOnly={
                Boolean(
                  truckVisitId,
                )
              }
              disabled={
                submitting
              }
              placeholder="29H-123.45"
              onChange={(
                event,
              ) =>
                setVehiclePlate(
                  event.target
                    .value
                    .toUpperCase(),
                )
              }
            />
          </label>

          <label>
            <span>
              Tài xế
              {!truckVisitId &&
                ' *'}
            </span>

            <input
              type="text"
              value={
                driverName
              }
              readOnly={
                Boolean(
                  truckVisitId,
                )
              }
              disabled={
                submitting
              }
              placeholder="Tên tài xế"
              onChange={(
                event,
              ) =>
                setDriverName(
                  event.target
                    .value,
                )
              }
            />
          </label>

          <label>
            <span>
              Transporter ID
            </span>

            <input
              type="text"
              value={
                transporterId
              }
              readOnly={
                Boolean(
                  truckVisitId,
                )
              }
              disabled={
                submitting
              }
              placeholder="Tùy chọn"
              onChange={(
                event,
              ) =>
                setTransporterId(
                  event.target
                    .value,
                )
              }
            />
          </label>

          {selectedTruckVisit && (
            <div className="gate-in-truck-summary">
              <span>
                Gate Lane
              </span>

              <strong>
                {selectedTruckVisit
                  .gateLane ??
                  '—'}
              </strong>
            </div>
          )}
        </div>
      </section>

      {validationError && (
        <div className="gate-in-validation-error">
          <strong>!</strong>

          <span>
            {
              validationError
            }
          </span>
        </div>
      )}

      <div className="gate-in-form__actions">
        <button
          type="submit"
          className="gate-in-submit"
          disabled={
            submitting
          }
        >
          {submitting
            ? 'Đang Gate-in...'
            : 'Xác nhận Gate-in'}
        </button>
      </div>
    </form>
  );
}
