import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
} from 'react-router-dom';

import {
  containerApi,
} from '../../containers/api/container.api';

import type {
  ContainerListItem,
} from '../../containers/container.types';

import {
  truckVisitApi,
} from '../api/truck-visit.api';

import './TruckVisits.css';

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
      return body.error.message;
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

  return 'Không thể tạo Truck Visit.';
}

export function TruckVisitCreatePage() {
  const navigate =
    useNavigate();

  const [
    candidates,
    setCandidates,
  ] =
    useState<
      ContainerListItem[]
    >([]);

  const [
    containerSearch,
    setContainerSearch,
  ] = useState('');

  const [
    selectedVisitIds,
    setSelectedVisitIds,
  ] =
    useState<string[]>(
      [],
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
    appointmentAt,
    setAppointmentAt,
  ] = useState('');

  const [
    gateLane,
    setGateLane,
  ] = useState('');

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

  useEffect(() => {
    async function loadCandidates() {
      try {
        setLoading(true);

        const containers =
          await containerApi.list();

        /*
         * UI spec chọn container AUTHORIZED
         * để tạo Truck Visit.
         */
        setCandidates(
          containers.filter(
            (container) =>
              container.status ===
              'AUTHORIZED',
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
    }

    void loadCandidates();
  }, []);

  const filteredCandidates =
    useMemo(() => {
      const needle =
        containerSearch
          .trim()
          .toUpperCase();

      if (!needle) {
        return candidates;
      }

      return candidates.filter((container) =>
        [
          container.containerNumber,
          container.consigneeName,
          container.hblNumber,
          container.mblNumber,
        ].some(
          (value) =>
            value?.toUpperCase().includes(needle) ?? false,
        ),
      );
    }, [
      candidates,
      containerSearch,
    ]);

  function toggleContainer(
    visitId: string,
  ) {
    setSelectedVisitIds(
      (current) =>
        current.includes(
          visitId,
        )
          ? current.filter(
              (id) =>
                id !== visitId,
            )
          : [
              ...current,
              visitId,
            ],
    );
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (
      !vehiclePlate.trim()
    ) {
      setError(
        'Vui lòng nhập biển số xe.',
      );

      return;
    }

    if (!driverName.trim()) {
      setError(
        'Vui lòng nhập tên tài xế.',
      );

      return;
    }

    if (
      selectedVisitIds.length ===
      0
    ) {
      setError(
        'Vui lòng chọn ít nhất một container.',
      );

      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const created =
        await truckVisitApi.create(
          {
            vehiclePlate,

            driverName,

            transporterId:
              transporterId.trim() ||
              undefined,

            appointmentAt:
              appointmentAt
                ? new Date(
                    appointmentAt,
                  ).toISOString()
                : undefined,

            gateLane:
              gateLane.trim() ||
              undefined,

            containerVisitIds:
              selectedVisitIds,
          },
        );

      navigate(
        `/truck-visits/${encodeURIComponent(
          created.id,
        )}`,
        {
          replace: true,
        },
      );
    } catch (
      submitError
    ) {
      setError(
        getErrorMessage(
          submitError,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="truck-visit-create-page">
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
      </div>

      <div className="truck-visit-create-heading">
        <span>
          GATE APPOINTMENT
        </span>

        <h2>
          Tạo Truck Visit
        </h2>

        <p>
          Gắn phương tiện và
          container đã được
          authorize vào một
          chuyến đến ICD.
        </p>
      </div>

      {error && (
        <div className="truck-visit-message truck-visit-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      <form
        className="truck-visit-create-grid"
        onSubmit={(event) => {
          void handleSubmit(
            event,
          );
        }}
      >
        <main className="truck-visit-card">
          <div className="truck-visit-card__heading">
            <span>
              VEHICLE
            </span>

            <h3>
              Thông tin xe
            </h3>
          </div>

          <div className="truck-visit-form-grid">
            <label>
              <span>
                Biển số xe *
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
                Tài xế *
              </span>

              <input
                type="text"
                value={
                  driverName
                }
                disabled={
                  submitting
                }
                placeholder="Nguyễn Văn A"
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

            <label>
              <span>
                Giờ hẹn
              </span>

              <input
                type="datetime-local"
                value={
                  appointmentAt
                }
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) =>
                  setAppointmentAt(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label>
              <span>
                Gate lane
              </span>

              <input
                type="text"
                value={
                  gateLane
                }
                disabled={
                  submitting
                }
                placeholder="Ví dụ: GATE-01"
                onChange={(
                  event,
                ) =>
                  setGateLane(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>
        </main>

        <aside className="truck-visit-card truck-visit-create-containers">
          <div className="truck-visit-card__heading">
            <div>
              <span>
                CONTAINERS
              </span>

              <h3>
                Container đã
                AUTHORIZED
              </h3>
            </div>

            <strong>
              {
                selectedVisitIds.length
              }{' '}
              đã chọn
            </strong>
          </div>

          <div className="truck-visit-container-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Tìm container..."
              value={
                containerSearch
              }
              onChange={(
                event,
              ) =>
                setContainerSearch(
                  event.target
                    .value,
                )
              }
            />
          </div>

          {loading ? (
            <div className="truck-visit-candidate-state">
              Đang tải container...
            </div>
          ) : filteredCandidates.length ===
            0 ? (
            <div className="truck-visit-candidate-state">
              Không có container
              AUTHORIZED.
            </div>
          ) : (
            <div className="truck-visit-candidates">
              {filteredCandidates.map(
                (container) => {
                  const selected =
                    selectedVisitIds.includes(
                      container.visitId,
                    );

                  return (
                    <label
                      key={
                        container.visitId
                      }
                      className={
                        selected
                          ? 'truck-visit-candidate truck-visit-candidate--selected'
                          : 'truck-visit-candidate'
                      }
                    >
                      <input
                        type="checkbox"
                        checked={
                          selected
                        }
                        disabled={
                          submitting
                        }
                        onChange={() =>
                          toggleContainer(
                            container.visitId,
                          )
                        }
                      />

                      <div>
                        <strong>
                          {
                            container.containerNumber
                          }
                        </strong>

                        <small>
                          {[
                            container.size,
                            container.type,
                            container.consigneeName,
                          ]
                            .filter(
                              Boolean,
                            )
                            .join(
                              ' · ',
                            )}
                        </small>
                      </div>
                    </label>
                  );
                },
              )}
            </div>
          )}
        </aside>

        <div className="truck-visit-create-actions">
          <button
            type="button"
            disabled={
              submitting
            }
            onClick={() =>
              navigate(
                '/truck-visits',
              )
            }
          >
            Hủy
          </button>

          <button
            type="submit"
            className="truck-visit-create-actions__submit"
            disabled={
              submitting
            }
          >
            {submitting
              ? 'Đang tạo...'
              : 'Tạo Truck Visit'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default TruckVisitCreatePage;
