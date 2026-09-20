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
  truckVisitApi,
} from '../api/truck-visit.api';

import type {
  TruckVisit,
} from '../truck-visit.types';

import './TruckVisits.css';

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

function getErrorMessage(
  error: unknown,
): string {
  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Không thể tải Truck Visit.';
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
    <div className="truck-visit-info-row">
      <span>
        {label}
      </span>

      <strong>
        {value ?? '—'}
      </strong>
    </div>
  );
}

const lifecycle = [
  'SCHEDULED',
  'ARRIVED',
  'IN_PROGRESS',
  'COMPLETED',
];

export function TruckVisitDetailPage() {
  const params =
    useParams<{
      truckVisitId: string;
    }>();

  const navigate =
    useNavigate();

  const truckVisitId =
    params.truckVisitId;

  const [
    detail,
    setDetail,
  ] =
    useState<
      TruckVisit | null
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
    >(null);

  const load =
    useCallback(
      async () => {
        if (
          !truckVisitId
        ) {
          return;
        }

        try {
          setLoading(true);
          setError(null);

          setDetail(
            await truckVisitApi.getById(
              truckVisitId,
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
          setLoading(false);
        }
      },
      [truckVisitId],
    );

  useEffect(() => {
    void load();
  }, [load]);

  async function handleArrive() {
    if (!detail) {
      return;
    }

    try {
      setActionLoading(
        true,
      );

      setDetail(
        await truckVisitApi.arrive(
          detail.id,
        ),
      );
    } catch (
      actionError
    ) {
      setError(
        getErrorMessage(
          actionError,
        ),
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  async function handleCancel() {
    if (!detail) {
      return;
    }

    const confirmed =
      window.confirm(
        `Hủy Truck Visit của xe ${detail.vehiclePlate}?`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setActionLoading(
        true,
      );

      setDetail(
        await truckVisitApi.cancel(
          detail.id,
        ),
      );
    } catch (
      actionError
    ) {
      setError(
        getErrorMessage(
          actionError,
        ),
      );
    } finally {
      setActionLoading(
        false,
      );
    }
  }

  if (
    loading &&
    !detail
  ) {
    return (
      <div className="truck-visit-state">
        <div className="truck-visit-spinner" />

        <strong>
          Đang tải Truck Visit
        </strong>
      </div>
    );
  }

  if (
    error &&
    !detail
  ) {
    return (
      <div className="truck-visit-state">
        <strong>
          Không thể tải Truck
          Visit
        </strong>

        <span>
          {error}
        </span>

        <button
          type="button"
          onClick={() =>
            void load()
          }
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!detail) {
    return null;
  }

  const currentIndex =
    lifecycle.indexOf(
      detail.status,
    );

  return (
    <div className="truck-visit-detail-page">
      <div className="truck-visit-detail-toolbar">
        <button
          type="button"
          onClick={() =>
            navigate(
              '/truck-visits',
            )
          }
        >
          ← Truck Visits
        </button>

        <div>
          {detail.status ===
            'SCHEDULED' && (
            <button
              type="button"
              disabled={
                actionLoading
              }
              className="truck-visit-arrive-button"
              onClick={() =>
                void handleArrive()
              }
            >
              Xác nhận ARRIVED
            </button>
          )}

          {(
            detail.status ===
              'SCHEDULED' ||
            detail.status ===
              'ARRIVED'
          ) && (
            <button
              type="button"
              disabled={
                actionLoading
              }
              className="truck-visit-cancel-button"
              onClick={() =>
                void handleCancel()
              }
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="truck-visit-message truck-visit-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      <section className="truck-visit-hero">
        <div>
          <span>
            TRUCK VISIT
          </span>

          <h2>
            {detail.visitNumber ??
              detail.id}
          </h2>

          <p>
            {detail.vehiclePlate}
            {' · '}
            {detail.driverName}
          </p>
        </div>

        <div className="truck-visit-hero__status">
          <span>
            TRẠNG THÁI
          </span>

          <strong>
            {detail.status}
          </strong>
        </div>
      </section>

      <div className="truck-visit-detail-grid">
        <main>
          <section className="truck-visit-card">
            <div className="truck-visit-card__heading">
              <span>
                CONTAINERS
              </span>

              <h3>
                Container trong chuyến
              </h3>
            </div>

            <div className="truck-visit-container-list">
              {detail.containers.length ===
              0 ? (
                <div className="truck-visit-candidate-state">
                  Chưa có container.
                </div>
              ) : (
                detail.containers.map(
                  (container) => (
                    <article
                      key={
                        container.visitId
                      }
                    >
                      <div>
                        <Link
                          to={`/containers/${encodeURIComponent(
                            container.visitId,
                          )}`}
                        >
                          {
                            container.containerNumber
                          }
                        </Link>

                        <small>
                          {[
                            container.size,
                            container.type,
                            container.isoCode,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              ' · ',
                            )}
                        </small>
                      </div>

                      <span>
                        {container.status ??
                          '—'}
                      </span>

                      {detail.status ===
                        'ARRIVED' &&
                        container.status ===
                          'AUTHORIZED' && (
                          <Link
                            className="truck-visit-gatein-link"
                            to={`/gate-in?visitId=${encodeURIComponent(
                              container.visitId,
                            )}&truckVisitId=${encodeURIComponent(
                              detail.id,
                            )}`}
                          >
                            Gate-in →
                          </Link>
                        )}
                    </article>
                  ),
                )
              )}
            </div>
          </section>
        </main>

        <aside className="truck-visit-detail-sidebar">
          <section className="truck-visit-card">
            <div className="truck-visit-card__heading">
              <span>
                VEHICLE
              </span>

              <h3>
                Thông tin chuyến
              </h3>
            </div>

            <InfoRow
              label="Biển số"
              value={
                detail.vehiclePlate
              }
            />

            <InfoRow
              label="Trailer"
              value={
                detail.trailerPlate
              }
            />

            <InfoRow
              label="Tài xế"
              value={
                detail.driverName
              }
            />

            <InfoRow
              label="Transporter"
              value={
                detail.transporterName
              }
            />

            <InfoRow
              label="Gate Lane"
              value={
                detail.gateLane
              }
            />

            <InfoRow
              label="Giờ hẹn"
              value={formatDateTime(
                detail.appointmentAt,
              )}
            />
          </section>

          <section className="truck-visit-card">
            <div className="truck-visit-card__heading">
              <span>
                LIFECYCLE
              </span>

              <h3>
                Tiến trình chuyến
              </h3>
            </div>

            <div className="truck-visit-lifecycle">
              {lifecycle.map(
                (
                  status,
                  index,
                ) => (
                  <div
                    key={
                      status
                    }
                    className={
                      index <=
                      currentIndex
                        ? 'truck-visit-lifecycle__step truck-visit-lifecycle__step--active'
                        : 'truck-visit-lifecycle__step'
                    }
                  >
                    <span>
                      {index <=
                      currentIndex
                        ? '✓'
                        : ''}
                    </span>

                    <strong>
                      {status}
                    </strong>
                  </div>
                ),
              )}
            </div>

            {detail.status ===
              'CANCELLED' && (
              <div className="truck-visit-cancelled-banner">
                Chuyến đã bị
                CANCELLED.
              </div>
            )}
          </section>

          <section className="truck-visit-card">
            <div className="truck-visit-card__heading">
              <span>
                TIMESTAMPS
              </span>

              <h3>
                Thời gian
              </h3>
            </div>

            <InfoRow
              label="Created"
              value={formatDateTime(
                detail.createdAt,
              )}
            />

            <InfoRow
              label="Arrived"
              value={formatDateTime(
                detail.arrivedAt,
              )}
            />

            <InfoRow
              label="Completed"
              value={formatDateTime(
                detail.completedAt,
              )}
            />
          </section>
        </aside>
      </div>
    </div>
  );
}

export default TruckVisitDetailPage;
