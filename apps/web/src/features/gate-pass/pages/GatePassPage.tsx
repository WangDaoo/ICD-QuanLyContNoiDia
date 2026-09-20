import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import QRCode from 'react-qr-code';

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
  ContainerListItem,
} from '../../containers/container.types';

import {
  gatePassApi,
} from '../api/gate-pass.api';

import {
  GatePassReadinessPanel,
} from '../components/GatePassReadinessPanel';

import type {
  GatePass,
  GatePassSnapshot,
} from '../gate-pass.types';

import './GatePass.css';

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

  return 'Không thể xử lý Gate Pass.';
}

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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    },
  ).format(date);
}

function getPassTone(
  status: string,
): string {
  switch (
    status.toUpperCase()
  ) {
    case 'ACTIVE':
      return 'active';

    case 'USED':
      return 'used';

    case 'CANCELLED':
      return 'cancelled';

    default:
      return 'expired';
  }
}

export function GatePassPage() {
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
    snapshot,
    setSnapshot,
  ] =
    useState<
      GatePassSnapshot | null
    >(null);

  const [
    candidates,
    setCandidates,
  ] =
    useState<
      ContainerListItem[]
    >([]);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    vehiclePlate,
    setVehiclePlate,
  ] = useState('');

  const [
    receiverName,
    setReceiverName,
  ] = useState('');

  const [
    receiverIdNumber,
    setReceiverIdNumber,
  ] = useState('');

  const [
    createdPass,
    setCreatedPass,
  ] =
    useState<
      GatePass | null
    >(null);

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

  const load =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          if (!visitId) {
            const containers =
              await containerApi.list();

            setCandidates(
              containers.filter(
                (item) =>
                  item.status ===
                    'IN_YARD' ||
                  item.status ===
                    'GATE_PASS_ISSUED',
              ),
            );

            return;
          }

          const [
            containerResult,
            snapshotResult,
          ] =
            await Promise.all([
              containerApi.getDetail(
                visitId,
              ),

              gatePassApi.getSnapshot(
                visitId,
              ),
            ]);

          setContainer(
            containerResult,
          );

          setSnapshot(
            snapshotResult,
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

  const filteredCandidates =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toUpperCase();

      if (!needle) {
        return candidates;
      }

      return candidates.filter(
        (item) =>
          [
            item.containerNumber,
            item.consigneeName,
            item.hblNumber,
            item.mblNumber,
          ].some(
            (value) =>
              value
                ?.toUpperCase()
                .includes(
                  needle,
                ) ?? false,
          ),
      );
    }, [
      candidates,
      search,
    ]);

  const gatePass =
    createdPass ??
    snapshot?.gatePass ??
    null;

  async function handleCreate(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !visitId ||
      !snapshot
    ) {
      return;
    }

    if (
      !receiverName.trim()
    ) {
      setError(
        'Vui lòng nhập tên người nhận container.',
      );

      return;
    }

    if (
      !receiverIdNumber.trim()
    ) {
      setError(
        'Vui lòng nhập CMND/CCCD người nhận.',
      );

      return;
    }

    if (
      !snapshot.readiness.ready
    ) {
      setError(
        'Container chưa đạt Gate Pass readiness.',
      );

      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const created =
        await gatePassApi.create(
          visitId,
          {
            vehiclePlate:
              vehiclePlate.trim() ||
              undefined,

            receiverName,

            receiverIdNumber,
          },
        );

      /*
       * Giữ raw qrToken ngay trong
       * memory của page. Không cố
       * reconstruct token sau refresh.
       */
      setCreatedPass(
        created,
      );

      const refreshed =
        await gatePassApi.getSnapshot(
          visitId,
        );

      setSnapshot(
        refreshed,
      );

      const refreshedContainer =
        await containerApi.getDetail(
          visitId,
        );

      setContainer(
        refreshedContainer,
      );
    } catch (
      createError
    ) {
      setError(
        getErrorMessage(
          createError,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="gate-pass-state">
        <div className="gate-pass-spinner" />

        <strong>
          Đang kiểm tra Gate Pass
        </strong>
      </div>
    );
  }

  if (!visitId) {
    return (
      <div className="gate-pass-page">
        <div className="gate-pass-toolbar">
          <div>
            <h2>
              Phiếu ra cổng
            </h2>

            <p>
              Chọn container để kiểm
              tra readiness và quản lý
              Gate Pass.
            </p>
          </div>

          <Link
            to="/gate-out"
            className="gate-pass-toolbar-link"
          >
            Gate-out Scanner →
          </Link>
        </div>

        {error && (
          <div className="gate-pass-message gate-pass-message--error">
            <strong>!</strong>
            {error}
          </div>
        )}

        <section className="gate-pass-candidate-panel">
          <div className="gate-pass-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Container, consignee, HBL, MBL..."
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
            />
          </div>

          <div className="gate-pass-candidates">
            {filteredCandidates.length ===
            0 ? (
              <div className="gate-pass-empty">
                Không có container
                phù hợp.
              </div>
            ) : (
              filteredCandidates.map(
                (item) => (
                  <article
                    key={
                      item.visitId
                    }
                  >
                    <div>
                      <strong>
                        {
                          item.containerNumber
                        }
                      </strong>

                      <span>
                        {[
                          item.size,
                          item.type,
                          item.consigneeName,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            ' · ',
                          )}
                      </span>
                    </div>

                    <span className="gate-pass-candidate-status">
                      {
                        item.status
                      }
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/gate-pass/${encodeURIComponent(
                            item.visitId,
                          )}`,
                        )
                      }
                    >
                      Mở →
                    </button>
                  </article>
                ),
              )
            )}
          </div>
        </section>
      </div>
    );
  }

  if (
    error &&
    (
      !container ||
      !snapshot
    )
  ) {
    return (
      <div className="gate-pass-state">
        <strong>
          Không thể tải Gate Pass
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

  if (
    !container ||
    !snapshot
  ) {
    return null;
  }

  return (
    <div className="gate-pass-page">
      <div className="gate-pass-detail-toolbar">
        <button
          type="button"
          onClick={() =>
            navigate(
              '/gate-pass',
            )
          }
        >
          ← Phiếu ra cổng
        </button>

        <button
          type="button"
          onClick={() => {
            setCreatedPass(
              null,
            );

            void load();
          }}
        >
          ↻ Kiểm tra lại
        </button>
      </div>

      <section className="gate-pass-hero">
        <div>
          <span>
            CONTAINER
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

        <div>
          <span>
            VỊ TRÍ BÃI
          </span>

          <strong>
            {container.yardPosition
              ?.label ??
              '—'}
          </strong>
        </div>

        <div>
          <span>
            STATUS
          </span>

          <strong>
            {
              container.status
            }
          </strong>
        </div>
      </section>

      {error && (
        <div className="gate-pass-message gate-pass-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      <GatePassReadinessPanel
        readiness={
          snapshot.readiness
        }
      />

      {gatePass ? (
        <section className="gate-pass-issued">
          <div className="gate-pass-issued__main">
            <div className="gate-pass-issued__heading">
              <div>
                <span>
                  GATE PASS
                </span>

                <h3>
                  {gatePass.code ??
                    gatePass.id}
                </h3>
              </div>

              <span
                className={[
                  'gate-pass-status',
                  `gate-pass-status--${getPassTone(
                    gatePass.status,
                  )}`,
                ].join(' ')}
              >
                {
                  gatePass.status
                }
              </span>
            </div>

            <div className="gate-pass-issued__info">
              <div>
                <span>
                  Xe lấy hàng
                </span>

                <strong>
                  {gatePass.vehiclePlate ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Người nhận
                </span>

                <strong>
                  {gatePass.receiverName ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  CMND/CCCD
                </span>

                <strong>
                  {gatePass.receiverIdNumber ??
                    '—'}
                </strong>
              </div>

              <div>
                <span>
                  Ngày cấp
                </span>

                <strong>
                  {formatDateTime(
                    gatePass.issuedAt,
                  )}
                </strong>
              </div>

              <div>
                <span>
                  Hết hạn
                </span>

                <strong>
                  {formatDateTime(
                    gatePass.expiresAt,
                  )}
                </strong>
              </div>

              {gatePass.usedAt && (
                <div>
                  <span>
                    Đã sử dụng
                  </span>

                  <strong>
                    {formatDateTime(
                      gatePass.usedAt,
                    )}
                  </strong>
                </div>
              )}
            </div>

            {gatePass.status ===
              'ACTIVE' && (
              <div className="gate-pass-issued__actions">
                <button
                  type="button"
                  onClick={() =>
                    window.print()
                  }
                >
                  In Phiếu ra cổng
                </button>

                <Link
                  to={`/gate-out?code=${encodeURIComponent(
                    gatePass.code ??
                    '',
                  )}`}
                  className="gate-pass-primary-link"
                >
                  Mở Gate-out →
                </Link>
              </div>
            )}
          </div>

          <div className="gate-pass-qr-panel">
            {gatePass.qrToken ? (
              <>
                <div className="gate-pass-qr">
                  <QRCode
                    value={
                      gatePass.qrToken
                    }
                    size={210}
                  />
                </div>

                <strong>
                  Quét tại cổng ra
                </strong>

                <small>
                  QR token chỉ được giữ
                  trong phiên hiện tại.
                </small>
              </>
            ) : (
              <div className="gate-pass-qr-unavailable">
                <span>▦</span>

                <strong>
                  QR token không được
                  backend trả lại
                </strong>

                <small>
                  Đây là hành vi an toàn
                  nếu backend chỉ lưu
                  qr_token_hash. Sử dụng
                  QR đã in lúc phát hành
                  hoặc Gate Pass code tại
                  cổng.
                </small>
              </div>
            )}
          </div>
        </section>
      ) : snapshot.readiness
          .ready ? (
        <form
          className="gate-pass-create"
          onSubmit={(
            event,
          ) => {
            void handleCreate(
              event,
            );
          }}
        >
          <div className="gate-pass-create__heading">
            <span>
              ISSUE GATE PASS
            </span>

            <h3>
              Tạo Phiếu ra cổng
            </h3>

            <p>
              Backend sẽ chạy lại
              readiness ngay trước khi
              tạo Gate Pass.
            </p>
          </div>

          <div className="gate-pass-create__fields">
            <label>
              <span>
                Biển số xe lấy hàng
              </span>

              <input
                type="text"
                value={
                  vehiclePlate
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
                Tên người nhận *
              </span>

              <input
                type="text"
                value={
                  receiverName
                }
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) =>
                  setReceiverName(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label>
              <span>
                CMND/CCCD *
              </span>

              <input
                type="text"
                value={
                  receiverIdNumber
                }
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) =>
                  setReceiverIdNumber(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>

          <button
            type="submit"
            className="gate-pass-create__submit"
            disabled={
              submitting
            }
          >
            {submitting
              ? 'Đang tạo...'
              : 'Tạo Phiếu ra cổng'}
          </button>
        </form>
      ) : (
        <div className="gate-pass-blocked-action">
          <strong>
            Chưa thể tạo Phiếu ra
            cổng
          </strong>

          <p>
            Xử lý toàn bộ blocker ở
            trên rồi bấm “Kiểm tra
            lại”. Frontend không có
            quyền override readiness.
          </p>
        </div>
      )}
    </div>
  );
}

export default GatePassPage;
