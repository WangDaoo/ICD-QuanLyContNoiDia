import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
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
  YardRecommendationList,
} from '../components/YardRecommendationList';

import {
  YardSlotGrid,
} from '../components/YardSlotGrid';

import type {
  YardAssignmentResult,
  YardRecommendation,
  YardSlot,
} from '../yard.types';

import './Yard.css';

function getErrorMessage(
  error: unknown,
): string {
  if (
    typeof error === 'object' &&
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

  return 'Không thể xử lý Yard Assignment.';
}

function formatWeight(
  value?: number | null,
): string {
  if (!value) {
    return '—';
  }

  return `${new Intl.NumberFormat(
    'vi-VN',
  ).format(value)} kg`;
}

export function YardAssignmentPage() {
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
    recommendations,
    setRecommendations,
  ] =
    useState<
      YardRecommendation[]
    >([]);

  const [
    selectedSlot,
    setSelectedSlot,
  ] =
    useState<
      YardSlot | null
    >(null);

  const [
    selectedRecommendation,
    setSelectedRecommendation,
  ] =
    useState<
      YardRecommendation | null
    >(null);

  const [
    blockFilter,
    setBlockFilter,
  ] = useState('ALL');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    result,
    setResult,
  ] =
    useState<
      YardAssignmentResult | null
    >(null);

  const load =
    useCallback(
      async () => {
        if (!visitId) {
          return;
        }

        try {
          setLoading(true);
          setError(null);

          const [
            containerResult,
            slotResult,
            recommendationResult,
          ] =
            await Promise.all([
              containerApi.getDetail(
                visitId,
              ),

              yardApi.getSlots(),

              yardApi.getRecommendations(
                visitId,
              ),
            ]);

          setContainer(
            containerResult,
          );

          setSlots(
            slotResult,
          );

          setRecommendations(
            recommendationResult,
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
            !slot.currentContainer,
        ),
      [slots],
    );

  const blocks =
    useMemo(
      () =>
        Array.from(
          new Set(
            availableSlots
              .map(
                (slot) =>
                  slot.block,
              )
              .filter(Boolean),
          ),
        ).sort(),
      [availableSlots],
    );

  const manualSlots =
    useMemo(
      () =>
        availableSlots.filter(
          (slot) =>
            blockFilter ===
              'ALL' ||
            slot.block ===
              blockFilter,
        ),
      [
        availableSlots,
        blockFilter,
      ],
    );

  function chooseRecommendation(
    item:
      YardRecommendation,
  ) {
    setSelectedRecommendation(
      item,
    );

    setSelectedSlot(
      item.slot,
    );

    setError(null);
  }

  function chooseManualSlot(
    slot: YardSlot,
  ) {
    setSelectedSlot(
      slot,
    );

    setSelectedRecommendation(
      null,
    );

    setError(null);
  }

  async function handleAssign() {
    if (
      !visitId ||
      !selectedSlot
    ) {
      setError(
        'Vui lòng chọn Yard Slot.',
      );

      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const assignment =
        await yardApi.assign(
          visitId,
          selectedSlot.id,
        );

      setResult(
        assignment,
      );
    } catch (
      assignError
    ) {
      setError(
        getErrorMessage(
          assignError,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!visitId) {
    return (
      <div className="yard-state">
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
      <div className="yard-state">
        <div className="yard-spinner" />

        <strong>
          Đang tải Yard Assignment
        </strong>
      </div>
    );
  }

  if (
    error &&
    !container
  ) {
    return (
      <div className="yard-state">
        <strong>
          Không thể mở Yard
          Assignment
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

  if (result) {
    return (
      <div className="yard-assignment-success">
        <div className="yard-assignment-success__icon">
          ✓
        </div>

        <span>
          YARD ASSIGNED
        </span>

        <h2>
          Xếp vị trí thành công
        </h2>

        <p>
          Container{' '}
          <strong>
            {
              container.containerNumber
            }
          </strong>{' '}
          đã được xếp vào vị trí{' '}
          <strong>
            {result.position ??
              selectedSlot?.label ??
              result.slotId}
          </strong>.
        </p>

        <div className="yard-assignment-success__actions">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/containers/${encodeURIComponent(
                  visitId,
                )}`,
              )
            }
          >
            Xem Container
          </button>

          <button
            type="button"
            className="yard-primary-button"
            onClick={() =>
              navigate(
                '/yard',
              )
            }
          >
            Về Yard →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="yard-assignment-page">
      <div className="yard-assignment-toolbar">
        <button
          type="button"
          onClick={() =>
            navigate(
              '/yard',
            )
          }
        >
          ← Yard
        </button>
      </div>

      <section className="yard-assignment-hero">
        <div>
          <span>
            YARD ASSIGNMENT
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

        <div className="yard-assignment-hero__meta">
          <div>
            <span>
              STATUS
            </span>

            <strong>
              {container.status}
            </strong>
          </div>

          <div>
            <span>
              GROSS WEIGHT
            </span>

            <strong>
              {formatWeight(
                container.grossWeight,
              )}
            </strong>
          </div>
        </div>
      </section>

      {container.status !==
      'IN_YARD' ? (
        <div className="yard-message yard-message--error">
          <strong>!</strong>

          Container phải ở trạng
          thái IN_YARD trước khi
          được assign vị trí.
        </div>
      ) : container.yardPosition ? (
        <div className="yard-message yard-message--warning">
          <strong>!</strong>

          Container hiện đã có vị
          trí{' '}
          <b>
            {container.yardPosition
              .label ??
              'Yard Slot'}
          </b>
          . Internal movement sẽ
          được xử lý ở Step 10B.
        </div>
      ) : (
        <>
          {error && (
            <div className="yard-message yard-message--error">
              <strong>!</strong>
              {error}
            </div>
          )}

          <section className="yard-card">
            <div className="yard-card__heading">
              <div>
                <span>
                  RECOMMENDATIONS
                </span>

                <h3>
                  Gợi ý vị trí
                </h3>
              </div>

              <small>
                Rule-based + ML
                ranking nếu được bật
              </small>
            </div>

            <YardRecommendationList
              recommendations={
                recommendations
              }
              selectedSlotId={
                selectedSlot?.id
              }
              disabled={
                submitting
              }
              onSelect={
                chooseRecommendation
              }
            />
          </section>

          <section className="yard-card">
            <div className="yard-card__heading">
              <div>
                <span>
                  MANUAL
                </span>

                <h3>
                  Chọn vị trí thủ công
                </h3>
              </div>

              <small>
                Backend sẽ validate
                hard rules khi xác
                nhận
              </small>
            </div>

            <div className="yard-manual-filter">
              <label>
                <span>
                  Block
                </span>

                <select
                  value={
                    blockFilter
                  }
                  disabled={
                    submitting
                  }
                  onChange={(
                    event,
                  ) =>
                    setBlockFilter(
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="ALL">
                    Tất cả
                  </option>

                  {blocks.map(
                    (block) => (
                      <option
                        key={
                          block
                        }
                        value={
                          block
                        }
                      >
                        Block{' '}
                        {block}
                      </option>
                    ),
                  )}
                </select>
              </label>

              {selectedSlot && (
                <div className="yard-selected-slot">
                  <span>
                    ĐÃ CHỌN
                  </span>

                  <strong>
                    {
                      selectedSlot.label
                    }
                  </strong>

                  <small>
                    {selectedRecommendation
                      ? `Recommendation #${selectedRecommendation.rank}`
                      : 'Manual selection'}
                  </small>
                </div>
              )}
            </div>

            <YardSlotGrid
              slots={
                manualSlots
              }
              selectable
              selectedSlotId={
                selectedSlot?.id
              }
              onSelect={
                chooseManualSlot
              }
            />
          </section>

          <section className="yard-hard-rules">
            <strong>
              Hard rules do backend
              kiểm tra
            </strong>

            <div>
              <span>
                ✓ Slot operational
              </span>

              <span>
                ✓ Slot chưa occupied
              </span>

              <span>
                ✓ Kích thước phù hợp
              </span>

              <span>
                ✓ Reefer power phù hợp
              </span>

              <span>
                ✓ Không vượt max weight
              </span>
            </div>
          </section>

          <div className="yard-assignment-actions">
            <button
              type="button"
              disabled={
                submitting
              }
              onClick={() =>
                navigate(
                  '/yard',
                )
              }
            >
              Hủy
            </button>

            <button
              type="button"
              className="yard-primary-button"
              disabled={
                submitting ||
                !selectedSlot
              }
              onClick={() => {
                void handleAssign();
              }}
            >
              {submitting
                ? 'Đang xếp vị trí...'
                : selectedSlot
                  ? `Xác nhận ${selectedSlot.label}`
                  : 'Chọn Yard Slot'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default YardAssignmentPage;
