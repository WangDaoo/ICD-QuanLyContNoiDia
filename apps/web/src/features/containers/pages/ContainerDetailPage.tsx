import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import {
  containerApi,
} from '../api/container.api';

import {
  ContainerTimeline,
} from '../components/ContainerTimeline';

import type {
  ContainerDetail,
  ContainerTimelineEvent,
} from '../container.types';

import './Containers.css';

function getStatusLabel(
  status: string,
): string {
  switch (
    status.toUpperCase()
  ) {
    case 'PENDING':
      return 'Chờ xử lý';

    case 'AUTHORIZED':
      return 'Đã ủy quyền';

    case 'IN_YARD':
      return 'Trong bãi';

    case 'GATE_PASS_ISSUED':
      return 'Đã cấp Gate Pass';

    case 'EXITED':
      return 'Đã Gate-out';

    case 'CANCELLED':
      return 'Đã hủy';

    default:
      return status;
  }
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

function formatWeight(
  value?: number | null,
): string {
  if (
    value === undefined ||
    value === null
  ) {
    return '—';
  }

  return `${new Intl.NumberFormat(
    'vi-VN',
  ).format(value)} kg`;
}

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Không thể tải Container Detail.';
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value:
    | string
    | number
    | null
    | undefined;
}) {
  return (
    <div className="container-info-row">
      <span>
        {label}
      </span>

      <strong>
        {value ??
          '—'}
      </strong>
    </div>
  );
}

export function ContainerDetailPage() {
  const params =
    useParams<{
      visitId: string;
    }>();

  const navigate =
    useNavigate();

  const visitId =
    params.visitId;

  const [
    detail,
    setDetail,
  ] =
    useState<
      ContainerDetail | null
    >(null);

  const [
    events,
    setEvents,
  ] =
    useState<
      ContainerTimelineEvent[]
    >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

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
        if (!visitId) {
          return;
        }

        try {
          setLoading(true);
          setError(null);

          const [
            detailResult,
            eventsResult,
          ] =
            await Promise.all([
              containerApi.getDetail(
                visitId,
              ),

              containerApi.getEvents(
                visitId,
              ),
            ]);

          setDetail(
            detailResult,
          );

          setEvents(
            eventsResult,
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

  if (!visitId) {
    return (
      <div className="containers-state">
        <strong>
          Thiếu visitId.
        </strong>
      </div>
    );
  }

  if (
    loading &&
    !detail
  ) {
    return (
      <div className="containers-state">
        <div className="containers-spinner" />

        <strong>
          Đang tải Container
          Detail
        </strong>
      </div>
    );
  }

  if (
    error &&
    !detail
  ) {
    return (
      <div className="containers-state">
        <div className="containers-error-icon">
          !
        </div>

        <strong>
          Không thể tải
          container
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

  if (!detail) {
    return null;
  }

  return (
    <div className="container-detail-page">
      <div className="container-detail-toolbar">
        <button
          type="button"
          className="container-detail-back"
          onClick={() =>
            navigate(
              '/containers',
            )
          }
        >
          ← Container
        </button>

        <button
          type="button"
          className="containers-refresh"
          onClick={() => {
            void load();
          }}
        >
          ↻ Làm mới
        </button>
      </div>

      <section className="container-hero">
        <div>
          <span className="container-hero__eyebrow">
            CONTAINER VISIT
          </span>

          <div className="container-hero__title">
            <h2>
              {
                detail.containerNumber
              }
            </h2>

            <span className="container-hero__status">
              {getStatusLabel(
                detail.status,
              )}
            </span>
          </div>

          <p>
            {[
              detail.size,
              detail.type,
              detail.isoCode,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </div>

        <div className="container-hero__position">
          <span>
            VỊ TRÍ HIỆN TẠI
          </span>

          <strong>
            {detail.yardPosition
              ?.label ??
              'Chưa có vị trí'}
          </strong>
        </div>
      </section>

      <div className="container-detail-grid">
        <div className="container-detail-main">
          <section className="container-card">
            <div className="container-card__heading">
              <div>
                <span>
                  CONTAINER
                </span>

                <h3>
                  Thông tin cơ bản
                </h3>
              </div>
            </div>

            <div className="container-info-grid">
              <InfoRow
                label="Container No."
                value={
                  detail.containerNumber
                }
              />

              <InfoRow
                label="ISO Code"
                value={
                  detail.isoCode
                }
              />

              <InfoRow
                label="Kích thước"
                value={
                  detail.size
                }
              />

              <InfoRow
                label="Loại"
                value={
                  detail.type
                }
              />

              <InfoRow
                label="Seal"
                value={
                  detail.sealNumber
                }
              />

              <InfoRow
                label="Gross Weight"
                value={formatWeight(
                  detail.grossWeight,
                )}
              />
            </div>
          </section>

          <section className="container-card">
            <div className="container-card__heading">
              <div>
                <span>
                  DOCUMENTS
                </span>

                <h3>
                  Manifest & Bill of
                  Lading
                </h3>
              </div>
            </div>

            <div className="container-info-grid">
              <InfoRow
                label="Manifest"
                value={
                  detail.manifest
                    ?.manifestNumber
                }
              />

              <InfoRow
                label="Vessel"
                value={
                  detail.manifest
                    ?.vesselName
                }
              />

              <InfoRow
                label="Voyage"
                value={
                  detail.manifest
                    ?.voyageNumber
                }
              />

              <InfoRow
                label="Master BL"
                value={
                  detail.masterBl
                    ?.number
                }
              />

              <InfoRow
                label="House BL"
                value={
                  detail.houseBl
                    ?.number
                }
              />

              <InfoRow
                label="Consignee"
                value={
                  detail.consignee
                    ?.name
                }
              />

              <InfoRow
                label="Clearing Agent"
                value={
                  detail
                    .clearingAgent
                    ?.name
                }
              />
            </div>
          </section>

          <section className="container-card">
            <div className="container-card__heading">
              <div>
                <span>
                  TIMELINE
                </span>

                <h3>
                  Lịch sử nghiệp vụ
                </h3>
              </div>

              <span className="container-card__count">
                {events.length}{' '}
                sự kiện
              </span>
            </div>

            <ContainerTimeline
              events={events}
            />
          </section>
        </div>

        <aside className="container-detail-sidebar">
          <section className="container-card">
            <div className="container-card__heading">
              <div>
                <span>
                  LIFECYCLE
                </span>

                <h3>
                  Trạng thái hiện tại
                </h3>
              </div>
            </div>

            <div className="container-lifecycle">
              {[
                'PENDING',
                'AUTHORIZED',
                'IN_YARD',
                'GATE_PASS_ISSUED',
                'EXITED',
              ].map(
                (
                  state,
                ) => {
                  const order = [
                    'PENDING',
                    'AUTHORIZED',
                    'IN_YARD',
                    'GATE_PASS_ISSUED',
                    'EXITED',
                  ];

                  const current =
                    order.indexOf(
                      detail.status,
                    );

                  const index =
                    order.indexOf(
                      state,
                    );

                  const completed =
                    current >= index;

                  return (
                    <div
                      key={state}
                      className={[
                        'container-lifecycle__step',
                        completed
                          ? 'container-lifecycle__step--active'
                          : '',
                        detail.status ===
                        state
                          ? 'container-lifecycle__step--current'
                          : '',
                      ]
                        .filter(
                          Boolean,
                        )
                        .join(' ')}
                    >
                      <span>
                        {completed
                          ? '✓'
                          : ''}
                      </span>

                      <strong>
                        {getStatusLabel(
                          state,
                        )}
                      </strong>
                    </div>
                  );
                },
              )}
            </div>
          </section>

          <section className="container-card">
            <div className="container-card__heading">
              <div>
                <span>
                  GATE
                </span>

                <h3>
                  Gate timestamps
                </h3>
              </div>
            </div>

            <InfoRow
              label="Gate-in"
              value={formatDateTime(
                detail.gateInAt,
              )}
            />

            <InfoRow
              label="Gate-out"
              value={formatDateTime(
                detail.gateOutAt,
              )}
            />
          </section>

          <section className="container-card">
            <div className="container-card__heading">
              <div>
                <span>
                  TRUCK VISIT
                </span>

                <h3>
                  Phương tiện
                </h3>
              </div>
            </div>

            <InfoRow
              label="Biển số xe"
              value={
                detail.truckVisit
                  ?.vehiclePlate
              }
            />

            <InfoRow
              label="Trailer"
              value={
                detail.truckVisit
                  ?.trailerPlate
              }
            />

            <InfoRow
              label="Tài xế"
              value={
                detail.truckVisit
                  ?.driverName
              }
            />

            <InfoRow
              label="Trạng thái chuyến"
              value={
                detail.truckVisit
                  ?.status
              }
            />
          </section>

          <section className="container-card">
            <div className="container-card__heading">
              <div>
                <span>
                  QUICK ACCESS
                </span>

                <h3>
                  Nghiệp vụ liên quan
                </h3>
              </div>
            </div>

            <div className="container-related-links">
              <Link
                to={`/yard?visitId=${encodeURIComponent(
                  detail.visitId,
                )}`}
              >
                <span>▦</span>
                Yard Operations
                <b>→</b>
              </Link>

              <Link
                to={`/billing?visitId=${encodeURIComponent(
                  detail.visitId,
                )}`}
              >
                <span>₫</span>
                Billing
                <b>→</b>
              </Link>

              <Link
                to={`/gate-pass?visitId=${encodeURIComponent(
                  detail.visitId,
                )}`}
              >
                <span>⌁</span>
                Gate Pass
                <b>→</b>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default ContainerDetailPage;
