import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  handoverApi,
} from '../api/handover.api';

import {
  HandoverTimeline,
} from '../components/HandoverTimeline';

import type {
  TransportHandover,
} from '../handover.types';

import './Handovers.css';

const REASON_CODES = [
  {
    value:
      'SEAL_BROKEN',

    label:
      'Seal rách/sai mã',
  },
  {
    value:
      'CONTAINER_DAMAGED',

    label:
      'Hư hỏng vỏ cont',
  },
  {
    value:
      'WRONG_RECEIVER',

    label:
      'Sai người nhận',
  },
  {
    value:
      'INCORRECT_CARGO',

    label:
      'Sai hàng hoá',
  },
  {
    value:
      'OTHER',

    label:
      'Khác',
  },
];

function formatDateTime(
  value?: string | null,
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime(),
  )
    ? '—'
    : date.toLocaleString(
        'vi-VN',
      );
}

function tone(
  status: string,
): string {
  switch (
    status
  ) {
    case 'COMPLETED':
    case 'ICD_CONFIRMED':
      return 'success';

    case 'PARTNER_CONFIRMED':
    case 'IN_TRANSIT':
    case 'PARTNER_ACCEPTED':
      return 'primary';

    case 'DISPUTED':
    case 'PARTNER_REJECTED':
    case 'DELIVERY_FAILED':
      return 'danger';

    case 'READY_FOR_HANDOVER':
      return 'warning';

    default:
      return 'neutral';
  }
}

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

  return error instanceof
    Error
    ? error.message
    : 'Thao tác không thành công.';
}

export function HandoverDetailPage() {
  const {
    handoverId,
  } = useParams<{
    handoverId: string;
  }>();

  const [
    searchParams,
  ] =
    useSearchParams();

  const navigate =
    useNavigate();

  const [
    handover,
    setHandover,
  ] =
    useState<
      TransportHandover | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionLoading,
    setActionLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(
      searchParams.get(
        'publishFailed',
      )
        ? 'Handover đã tạo bản nháp. Vui lòng bấm "Sẵn sàng bàn giao" để Publish lại.'
        : null,
    );

  const [
    showConfirmModal,
    setShowConfirmModal,
  ] = useState(false);

  const [
    confirmNote,
    setConfirmNote,
  ] = useState('');

  const [
    showDisputeModal,
    setShowDisputeModal,
  ] = useState(false);

  const [
    disputeReason,
    setDisputeReason,
  ] = useState(
    'SEAL_BROKEN',
  );

  const [
    disputeNote,
    setDisputeNote,
  ] = useState('');

  const [
    attachmentUrl,
    setAttachmentUrl,
  ] = useState('');

  const load =
    useCallback(
      async () => {
        if (!handoverId) {
          setError(
            'Thiếu handoverId.',
          );

          setLoading(
            false,
          );

          return;
        }

        try {
          setLoading(
            true,
          );

          setHandover(
            await handoverApi.getById(
              handoverId,
            ),
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
          setLoading(
            false,
          );
        }
      },
      [handoverId],
    );

  useEffect(() => {
    void load();
  }, [load]);

  async function handlePublish() {
    if (!handover) {
      return;
    }

    try {
      setActionLoading(
        true,
      );

      setError(null);

      await handoverApi.publish(
        handover.id,
      );

      await load();
    } catch (
      publishError
    ) {
      setError(
        getErrorMessage(
          publishError,
        ),
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  async function handleConfirm() {
    if (!handover) {
      return;
    }

    try {
      setActionLoading(
        true,
      );

      setError(null);

      await handoverApi.icdConfirm(
        handover.id,
        {
          note:
            confirmNote.trim() ||
            undefined,
        },
      );

      setShowConfirmModal(
        false,
      );

      await load();
    } catch (
      confirmError
    ) {
      setError(
        getErrorMessage(
          confirmError,
        ),
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  async function handleDispute() {
    if (!handover) {
      return;
    }

    if (
      !disputeNote.trim()
    ) {
      setError(
        'Vui lòng nhập lý do khiếu nại/dispute.',
      );

      return;
    }

    try {
      setActionLoading(
        true,
      );

      setError(null);

      await handoverApi.dispute(
        handover.id,
        {
          reasonCode:
            disputeReason,

          note:
            disputeNote.trim(),

          attachmentUrl:
            attachmentUrl.trim() ||
            undefined,
        },
      );

      setShowDisputeModal(
        false,
      );

      await load();
    } catch (
      disputeError
    ) {
      setError(
        getErrorMessage(
          disputeError,
        ),
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  if (loading) {
    return (
      <div className="handover-state">
        <div className="handover-spinner" />

        <strong>
          Đang tải chi tiết Handover
        </strong>
      </div>
    );
  }

  if (
    !handover ||
    error ===
      'Thiếu handoverId.'
  ) {
    return (
      <div className="handover-state">
        <strong>
          {error ??
            'Không tìm thấy Handover.'}
        </strong>

        <button
          type="button"
          onClick={() =>
            navigate(
              '/handovers',
            )
          }
        >
          ← Danh sách Handover
        </button>
      </div>
    );
  }

  return (
    <div className="handover-page">
      <button
        type="button"
        className="handover-back"
        onClick={() =>
          navigate(
            '/handovers',
          )
        }
      >
        ← Transport Handover
      </button>

      <div className="handover-detail-hero">
        <div>
          <span>
            {handover.handoverNumber ??
              handover.transportCode}
          </span>

          <h2>
            {
              handover.transportCode
            }
          </h2>

          <p>
            Đối tác:{' '}
            <strong>
              {handover.partnerName ??
                handover.partnerCode ??
                handover.partnerApiClientId ??
                '—'}
            </strong>
            {' · '}
            Kho:{' '}
            <strong>
              {handover.warehouseName ??
                handover.warehouseCode ??
                handover.warehouseId ??
                '—'}
            </strong>
          </p>
        </div>

        <div className="handover-detail-hero__actions">
          <span
            className={`handover-status handover-status--${tone(
              handover.status,
            )}`}
          >
            {
              handover.status
            }
          </span>

          {handover.status ===
            'DRAFT' && (
            <button
              type="button"
              className="handover-primary-button"
              disabled={
                actionLoading
              }
              onClick={() => {
                void handlePublish();
              }}
            >
              {actionLoading
                ? 'Đang Publish...'
                : 'Sẵn sàng bàn giao'}
            </button>
          )}

          {handover.status ===
            'PARTNER_CONFIRMED' && (
            <>
              <button
                type="button"
                className="handover-primary-button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setShowConfirmModal(
                    true,
                  )
                }
              >
                ICD xác nhận
              </button>

              <button
                type="button"
                className="handover-danger-button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setShowDisputeModal(
                    true,
                  )
                }
              >
                Khiếu nại (Dispute)
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="handover-message handover-message--error">
          <strong>!</strong>

          {error}
        </div>
      )}

      <HandoverTimeline
        handover={
          handover
        }
      />

      <div className="handover-detail-layout">
        <div className="handover-detail-main">
          <section className="handover-card">
            <div className="handover-card__heading">
              <span>
                INTEGRATION
              </span>

              <h3>
                Lịch sử xác nhận từ Partner API
              </h3>
            </div>

            {handover
              .confirmations
              .length ===
            0 ? (
              <div className="handover-empty">
                Chưa có xác nhận
                nào từ Partner
                API.
              </div>
            ) : (
              <div className="handover-confirmations">
                {handover.confirmations.map(
                  (
                    item,
                    index,
                  ) => (
                    <article
                      key={
                        item.id
                      }
                      className="handover-confirmation-card"
                    >
                      <header>
                        <span className="handover-confirmation-index">
                          #
                          {index +
                            1}
                        </span>

                        <strong>
                          {
                            item.type
                          }
                        </strong>

                        <small>
                          {formatDateTime(
                            item.confirmedAt ??
                              item.createdAt,
                          )}
                        </small>
                      </header>

                      <div className="handover-confirmation-grid">
                        <div>
                          <span>
                            Người nhận
                          </span>

                          <strong>
                            {item.receiverName ??
                              '—'}
                          </strong>

                          {item.receiverPhone && (
                            <small>
                              {
                                item.receiverPhone
                              }
                            </small>
                          )}
                        </div>

                        <div>
                          <span>
                            Tình trạng vỏ
                          </span>

                          <strong>
                            {item.condition ??
                              '—'}
                          </strong>
                        </div>

                        <div>
                          <span>
                            Vị trí GPS
                          </span>

                          <strong>
                            {item.latitude !=
                              null &&
                            item.longitude !=
                              null
                              ? `${item.latitude.toFixed(
                                  5,
                                )}, ${item.longitude.toFixed(
                                  5,
                                )}`
                              : '—'}
                          </strong>

                          {item.accuracyM !=
                            null && (
                            <small>
                              ±
                              {
                                item.accuracyM
                              }
                              m
                            </small>
                          )}
                        </div>
                      </div>

                      {item.note && (
                        <p className="handover-confirmation-note">
                          {
                            item.note
                          }
                        </p>
                      )}

                      {(item.proofImageUrl ||
                        item.signatureUrl) && (
                        <div className="handover-proofs">
                          {item.proofImageUrl && (
                            <a
                              href={
                                item.proofImageUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Ảnh bằng chứng
                              ↗
                            </a>
                          )}

                          {item.signatureUrl && (
                            <a
                              href={
                                item.signatureUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                            >
                              Chữ ký ↗
                            </a>
                          )}
                        </div>
                      )}
                    </article>
                  ),
                )}
              </div>
            )}
          </section>
        </div>

        <div className="handover-detail-side">
          <section className="handover-card">
            <div className="handover-card__heading">
              <span>
                CORE ICD
              </span>

              <h3>
                Container Visit
              </h3>
            </div>

            <dl className="handover-kv">
              <div>
                <dt>
                  Container
                </dt>

                <dd>
                  {handover.containerNumber ? (
                    <Link
                      to={`/containers/${encodeURIComponent(
                        handover.visitId,
                      )}`}
                    >
                      {
                        handover.containerNumber
                      }
                    </Link>
                  ) : (
                    '—'
                  )}
                </dd>
              </div>

              <div>
                <dt>
                  Core State
                </dt>

                <dd>
                  {handover.containerStatus ??
                    'EXITED'}
                </dd>
              </div>

              <div>
                <dt>
                  Gate-out
                </dt>

                <dd>
                  <Link
                    to="/gate-out"
                  >
                    Xem console
                    Gate-out →
                  </Link>
                </dd>
              </div>
            </dl>
          </section>

          <section className="handover-card">
            <div className="handover-card__heading">
              <span>
                PARTNER & DESTINATION
              </span>

              <h3>
                Đối tác & Kho
              </h3>
            </div>

            <dl className="handover-kv">
              <div>
                <dt>
                  Partner
                </dt>

                <dd>
                  {handover.partnerName ??
                    handover.partnerCode ??
                    handover.partnerApiClientId ??
                    '—'}
                </dd>
              </div>

              <div>
                <dt>
                  Kho đích
                </dt>

                <dd>
                  {handover.warehouseName ??
                    handover.warehouseCode ??
                    handover.warehouseId ??
                    '—'}
                </dd>
              </div>

              {handover.warehouseAddress && (
                <div>
                  <dt>
                    Địa chỉ
                  </dt>

                  <dd>
                    {
                      handover.warehouseAddress
                    }
                  </dd>
                </div>
              )}

              <div>
                <dt>
                  Dự kiến giao
                </dt>

                <dd>
                  {formatDateTime(
                    handover.expectedDeliveryAt,
                  )}
                </dd>
              </div>
            </dl>
          </section>

          <section className="handover-core-boundary">
            <strong>
              Core State Safety
            </strong>

            <span>
              Xác nhận hoặc
              Khiếu nại chỉ
              chuyển đổi trạng
              thái Transport
              Handover. Container
              Visit vẫn là
              EXITED.
            </span>
          </section>
        </div>
      </div>

      {showConfirmModal && (
        <div className="handover-modal-backdrop">
          <div className="handover-modal">
            <h3>
              ICD xác nhận hoàn
              tất bàn giao
            </h3>

            <p>
              Xác nhận đối soát
              bằng chứng giao
              hàng thành công từ
              Partner API.
            </p>

            <label className="handover-field">
              <span>
                Ghi chú đối
                soát
              </span>

              <textarea
                rows={3}
                value={
                  confirmNote
                }
                disabled={
                  actionLoading
                }
                onChange={(
                  event,
                ) =>
                  setConfirmNote(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <div className="handover-modal-actions">
              <button
                type="button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setShowConfirmModal(
                    false,
                  )
                }
              >
                Hủy
              </button>

              <button
                type="button"
                className="handover-primary-button"
                disabled={
                  actionLoading
                }
                onClick={() => {
                  void handleConfirm();
                }}
              >
                {actionLoading
                  ? 'Đang lưu...'
                  : 'Xác nhận hoàn tất'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDisputeModal && (
        <div className="handover-modal-backdrop">
          <div className="handover-modal">
            <h3>
              Tạo khiếu nại
              (Dispute)
            </h3>

            <p>
              Chuyển Handover sang
              DISPUTED. Handover
              gốc không bị xoá,
              Container Visit vẫn
              tiếp tục là EXITED.
            </p>

            <label className="handover-field">
              <span>
                Lý do khiếu
                nại *
              </span>

              <select
                value={
                  disputeReason
                }
                disabled={
                  actionLoading
                }
                onChange={(
                  event,
                ) =>
                  setDisputeReason(
                    event.target
                      .value,
                  )
                }
              >
                {REASON_CODES.map(
                  (
                    reason,
                  ) => (
                    <option
                      key={
                        reason.value
                      }
                      value={
                        reason.value
                      }
                    >
                      {
                        reason.label
                      }
                    </option>
                  ),
                )}
              </select>
            </label>

            <label className="handover-field">
              <span>
                Mô tả chi tiết *
              </span>

              <textarea
                rows={3}
                value={
                  disputeNote
                }
                disabled={
                  actionLoading
                }
                onChange={(
                  event,
                ) =>
                  setDisputeNote(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label className="handover-field">
              <span>
                Link ảnh/biên
                bản
              </span>

              <input
                value={
                  attachmentUrl
                }
                disabled={
                  actionLoading
                }
                placeholder="https://..."
                onChange={(
                  event,
                ) =>
                  setAttachmentUrl(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <div className="handover-modal-actions">
              <button
                type="button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setShowDisputeModal(
                    false,
                  )
                }
              >
                Hủy
              </button>

              <button
                type="button"
                className="handover-danger-button"
                disabled={
                  actionLoading
                }
                onClick={() => {
                  void handleDispute();
                }}
              >
                {actionLoading
                  ? 'Đang gửi...'
                  : 'Gửi khiếu nại'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HandoverDetailPage;
