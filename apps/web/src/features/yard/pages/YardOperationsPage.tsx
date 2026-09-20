import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  containerApi,
} from '../../containers/api/container.api';

import type {
  ContainerDetail,
} from '../../containers/container.types';

import {
  yardApi,
} from '../api/yard.api';

import {
  yardOperationsApi,
} from '../api/yard-operations.api';

import {
  YardOperationCard,
} from '../components/YardOperationCard';

import {
  YardOperationModal,
} from '../components/YardOperationModal';

import type {
  YardOperationModalState,
  YardOperationModalSubmit,
} from '../components/YardOperationModal';

import type {
  YardOperation,
  YardOperationsSnapshot,
} from '../yard-operation.types';

import type {
  YardSlot,
} from '../yard.types';

import './YardOperations.css';

const EMPTY_OPERATIONS:
  YardOperationsSnapshot = {
    movements: [],
    inspections: [],
    bookings: [],
    operations: [],
  };

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

    if (
      Array.isArray(
        body?.message,
      )
    ) {
      return body.message.join(
        ', ',
      );
    }
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Không thể xử lý Yard Operations.';
}

export function YardOperationsPage() {
  const params =
    useParams<{
      visitId?: string;
    }>();

  const [
    searchParams,
  ] =
    useSearchParams();

  const navigate =
    useNavigate();

  const visitId =
    params.visitId ??
    searchParams.get(
      'visitId',
    ) ??
    undefined;

  const [
    container,
    setContainer,
  ] =
    useState<
      ContainerDetail | null
    >(null);

  const [
    slots,
    setSlots,
  ] =
    useState<
      YardSlot[]
    >([]);

  const [
    snapshot,
    setSnapshot,
  ] =
    useState<
      YardOperationsSnapshot
    >(EMPTY_OPERATIONS);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    actionBusy,
    setActionBusy,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    success,
    setSuccess,
  ] =
    useState<
      string | null
    >(null);

  const [
    modal,
    setModal,
  ] =
    useState<
      YardOperationModalState | null
    >(null);

  const load =
    useCallback(
      async (
        refresh = false,
      ) => {
        if (!visitId) {
          return;
        }

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
            containerResult,
            slotResult,
            operationResult,
          ] =
            await Promise.all([
              containerApi.getDetail(
                visitId,
              ),

              yardApi.getSlots(),

              yardOperationsApi.getOperations(
                visitId,
              ),
            ]);

          setContainer(
            containerResult,
          );

          setSlots(
            slotResult,
          );

          setSnapshot(
            operationResult,
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
      [visitId],
    );

  useEffect(() => {
    void load();
  }, [load]);

  const availableSlots =
    useMemo(
      () =>
        slots.filter(
          (slot) =>
            slot.isOperational &&
            slot.status ===
              'AVAILABLE' &&
            !slot.currentContainer &&
            slot.label !==
              container
                ?.yardPosition
                ?.label,
        ),
      [
        slots,
        container,
      ],
    );

  const stats =
    useMemo(
      () => {
        const active =
          snapshot.operations.filter(
            (operation) =>
              operation.status ===
                'PENDING' ||
              operation.status ===
                'IN_PROGRESS',
          ).length;

        const holds =
          snapshot.inspections.filter(
            (inspection) =>
              inspection.result ===
              'HOLD',
          ).length;

        return {
          active,

          movements:
            snapshot.movements
              .length,

          inspections:
            snapshot.inspections
              .length,

          bookings:
            snapshot.bookings
              .length,

          holds,
        };
      },
      [snapshot],
    );

  async function mutate(
    callback:
      () => Promise<void>,

    message: string,
  ) {
    try {
      setActionBusy(true);

      setError(null);
      setSuccess(null);

      await callback();

      setSuccess(message);

      setModal(null);

      await load(true);
    } catch (
      mutationError
    ) {
      setError(
        getErrorMessage(
          mutationError,
        ),
      );
    } finally {
      setActionBusy(false);
    }
  }

  function handleStart(
    operation:
      YardOperation,
  ) {
    if (
      operation.operationType ===
      'MOVEMENT'
    ) {
      void mutate(
        () =>
          yardOperationsApi.startMovement(
            operation.id,
          ),

        'Internal Movement đã bắt đầu.',
      );

      return;
    }

    if (
      operation.operationType ===
      'INSPECTION'
    ) {
      void mutate(
        () =>
          yardOperationsApi.startInspection(
            operation.id,
          ),

        'Inspection đã bắt đầu.',
      );
    }
  }

  function handleComplete(
    operation:
      YardOperation,
  ) {
    if (
      operation.operationType ===
      'MOVEMENT'
    ) {
      setModal({
        type:
          'COMPLETE_MOVEMENT',

        movement:
          operation,
      });

      return;
    }

    if (
      operation.operationType ===
      'INSPECTION'
    ) {
      setModal({
        type:
          'COMPLETE_INSPECTION',

        inspection:
          operation,
      });
    }
  }

  async function handleModalSubmit(
    input:
      YardOperationModalSubmit,
  ) {
    if (
      !visitId ||
      !modal
    ) {
      return;
    }

    switch (input.type) {
      case 'CREATE_MOVEMENT': {
        await mutate(
          () =>
            yardOperationsApi.createMovement(
              visitId,
              {
                targetSlotId:
                  input.targetSlotId,

                notes:
                  input.notes,
              },
            ),

          'Đã tạo Internal Movement.',
        );

        return;
      }

      case 'COMPLETE_MOVEMENT': {
        if (
          modal.type !==
          'COMPLETE_MOVEMENT'
        ) {
          return;
        }

        await mutate(
          () =>
            yardOperationsApi.completeMovement(
              modal.movement
                .id,
              {
                notes:
                  input.notes,
              },
            ),

          'Internal Movement đã hoàn tất và vị trí container đã được cập nhật.',
        );

        return;
      }

      case 'CREATE_INSPECTION': {
        await mutate(
          () =>
            yardOperationsApi.createInspection(
              visitId,
              {
                inspectionType:
                  input.inspectionType,

                notes:
                  input.notes,
              },
            ),

          'Đã tạo Inspection.',
        );

        return;
      }

      case 'COMPLETE_INSPECTION': {
        if (
          modal.type !==
          'COMPLETE_INSPECTION'
        ) {
          return;
        }

        await mutate(
          () =>
            yardOperationsApi.completeInspection(
              modal.inspection
                .id,
              {
                result:
                  input.result,

                notes:
                  input.notes,
              },
            ),

          input.result ===
          'HOLD'
            ? 'Inspection hoàn tất với HOLD. Container đang có blocker Gate Pass.'
            : `Inspection hoàn tất với kết quả ${input.result}.`,
        );

        return;
      }

      case 'CREATE_BOOKING': {
        await mutate(
          () =>
            yardOperationsApi.createBooking(
              visitId,
              {
                bookingType:
                  input.bookingType,

                scheduledAt:
                  input.scheduledAt,

                notes:
                  input.notes,
              },
            ),

          'Đã tạo Yard Booking.',
        );
      }
    }
  }

  if (!visitId) {
    return (
      <div className="yard-ops-state">
        <strong>
          Thiếu visitId.
        </strong>
      </div>
    );
  }

  if (
    loading &&
    !container
  ) {
    return (
      <div className="yard-ops-state">
        <div className="yard-ops-spinner" />

        <strong>
          Đang tải Yard Operations
        </strong>
      </div>
    );
  }

  if (
    error &&
    !container
  ) {
    return (
      <div className="yard-ops-state">
        <strong>
          Không thể tải Yard Operations
        </strong>

        <span>
          {error}
        </span>

        <button
          type="button"
          onClick={() => {
            void load();
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!container) {
    return null;
  }

  return (
    <div className="yard-ops-page">
      <div className="yard-ops-toolbar">
        <div>
          <button
            type="button"
            className="yard-ops-back"
            onClick={() =>
              navigate(
                '/yard',
              )
            }
          >
            ← Yard
          </button>

          <span>
            YARD OPERATIONS
          </span>

          <h2>
            {
              container.containerNumber
            }
          </h2>

          <p>
            {[
              container.size,
              container.type,
              container.isoCode,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <button
          type="button"
          className="yard-ops-refresh"
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

      <section className="yard-ops-location">
        <div>
          <span>
            VỊ TRÍ HIỆN TẠI
          </span>

          <strong>
            {container
              .yardPosition
              ?.label ??
              'Chưa có vị trí'}
          </strong>
        </div>

        <div>
          <span>
            CONTAINER STATUS
          </span>

          <strong>
            {container.status}
          </strong>
        </div>

        <Link
          to={`/containers/${encodeURIComponent(
            visitId,
          )}`}
        >
          Container Detail →
        </Link>
      </section>

      {error && (
        <div className="yard-ops-message yard-ops-message--error">
          <strong>!</strong>

          {error}
        </div>
      )}

      {success && (
        <div className="yard-ops-message yard-ops-message--success">
          <strong>✓</strong>

          {success}
        </div>
      )}

      {stats.holds > 0 && (
        <div className="yard-ops-hold-warning">
          <strong>
            INSPECTION HOLD
          </strong>

          <span>
            Container hiện có{' '}
            {stats.holds}{' '}
            inspection kết quả
            HOLD. Gate Pass sẽ bị
            chặn cho đến khi điều
            kiện nghiệp vụ được xử
            lý.
          </span>
        </div>
      )}

      <section className="yard-ops-stats">
        <article>
          <span>
            ACTIVE
          </span>

          <strong>
            {stats.active}
          </strong>

          <small>
            Operation chưa hoàn tất
          </small>
        </article>

        <article>
          <span>
            MOVEMENT
          </span>

          <strong>
            {stats.movements}
          </strong>
        </article>

        <article>
          <span>
            INSPECTION
          </span>

          <strong>
            {stats.inspections}
          </strong>
        </article>

        <article>
          <span>
            BOOKING
          </span>

          <strong>
            {stats.bookings}
          </strong>
        </article>
      </section>

      <section className="yard-ops-actions">
        <button
          type="button"
          disabled={
            actionBusy ||
            container.status !==
              'IN_YARD' ||
            !container
              .yardPosition
        }
          onClick={() =>
            setModal({
              type:
                'CREATE_MOVEMENT',
            })
          }
        >
          <span>⇄</span>

          <div>
            <strong>
              Internal Movement
            </strong>

            <small>
              Di chuyển sang Yard
              Slot khác
            </small>
          </div>

          <b>+</b>
        </button>

        <button
          type="button"
          disabled={
            actionBusy ||
            container.status !==
              'IN_YARD'
          }
          onClick={() =>
            setModal({
              type:
                'CREATE_INSPECTION',
            })
          }
        >
          <span>◎</span>

          <div>
            <strong>
              Inspection
            </strong>

            <small>
              Tạo yêu cầu kiểm tra
            </small>
          </div>

          <b>+</b>
        </button>

        <button
          type="button"
          disabled={
            actionBusy ||
            container.status !==
              'IN_YARD'
          }
          onClick={() =>
            setModal({
              type:
                'CREATE_BOOKING',
            })
          }
        >
          <span>▤</span>

          <div>
            <strong>
              Yard Booking
            </strong>

            <small>
              Stripping / Stuffing
              / Inspection
            </small>
          </div>

          <b>+</b>
        </button>
      </section>

      <section className="yard-ops-panel">
        <div className="yard-ops-panel__heading">
          <div>
            <span>
              OPERATION HISTORY
            </span>

            <h3>
              Nghiệp vụ trong bãi
            </h3>
          </div>

          <strong>
            {
              snapshot.operations
                .length
            }{' '}
            operations
          </strong>
        </div>

        {snapshot.operations.length ===
        0 ? (
          <div className="yard-ops-empty">
            <span>✓</span>

            <strong>
              Chưa có Yard Operation
            </strong>

            <small>
              Tạo Movement,
              Inspection hoặc
              Booking bằng các nút
              phía trên.
            </small>
          </div>
        ) : (
          <div className="yard-ops-list">
            {snapshot.operations.map(
              (operation) => (
                <YardOperationCard
                  key={`${operation.operationType}-${operation.id}`}
                  operation={
                    operation
                  }
                  busy={
                    actionBusy
                  }
                  onStart={
                    handleStart
                  }
                  onComplete={
                    handleComplete
                  }
                />
              ),
            )}
          </div>
        )}
      </section>

      <section className="yard-ops-note">
        <strong>
          Yard Booking lifecycle
        </strong>

        <p>
          RC1 hiện chỉ expose API
          tạo Yard Booking trong
          contract Web/Mobile hiện
          tại. Vì vậy Booking được
          hiển thị read-only ở màn
          này; frontend không tự bịa
          endpoint start/complete/
          cancel.
        </p>
      </section>

      {modal && (
        <YardOperationModal
          state={modal}
          slots={
            availableSlots
          }
          busy={
            actionBusy
          }
          onClose={() =>
            setModal(null)
          }
          onSubmit={
            handleModalSubmit
          }
        />
      )}
    </div>
  );
}

export default YardOperationsPage;
