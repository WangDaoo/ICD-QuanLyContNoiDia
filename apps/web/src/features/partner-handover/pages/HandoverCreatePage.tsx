import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  containerApi,
} from '../../containers/api/container.api';

import type {
  ContainerListItem,
} from '../../containers/container.types';

import {
  handoverApi,
} from '../api/handover.api';

import type {
  HandoverCreateOptions,
} from '../handover.types';

import './Handovers.css';

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
    : 'Không thể tạo Handover.';
}

export function HandoverCreatePage() {
  const [
    searchParams,
  ] =
    useSearchParams();

  const navigate =
    useNavigate();

  const requestedVisitId =
    searchParams.get(
      'visitId',
    ) ?? '';

  const [
    containers,
    setContainers,
  ] =
    useState<
      ContainerListItem[]
    >([]);

  const [
    options,
    setOptions,
  ] =
    useState<HandoverCreateOptions>({
      partners: [],
      warehouses: [],
    });

  const [
    visitId,
    setVisitId,
  ] =
    useState(
      requestedVisitId,
    );

  const [
    partnerId,
    setPartnerId,
  ] = useState('');

  const [
    warehouseId,
    setWarehouseId,
  ] = useState('');

  const [
    transportCode,
    setTransportCode,
  ] = useState('');

  const [
    expectedDeliveryAt,
    setExpectedDeliveryAt,
  ] = useState('');

  const [
    note,
    setNote,
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
    async function load() {
      try {
        setLoading(true);

        const [
          containerResult,
          createOptions,
        ] =
          await Promise.all([
            containerApi.list(),

            handoverApi.getCreateOptions(),
          ]);

        setContainers(
          containerResult.filter(
            (container) =>
              container.status ===
              'EXITED',
          ),
        );

        setOptions(
          createOptions,
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

    void load();
  }, []);

  const selectedContainer =
    useMemo(
      () =>
        containers.find(
          (container) =>
            container.visitId ===
            visitId,
        ),
      [
        containers,
        visitId,
      ],
    );

  async function create(
    publish:
      boolean,
  ) {
    if (!visitId) {
      setError(
        'Vui lòng chọn Container Visit.',
      );

      return;
    }

    if (!partnerId) {
      setError(
        'Vui lòng chọn Partner.',
      );

      return;
    }

    if (!warehouseId) {
      setError(
        'Vui lòng chọn kho đích.',
      );

      return;
    }

    if (
      !transportCode.trim()
    ) {
      setError(
        'Vui lòng nhập Transport Code.',
      );

      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const created =
        await handoverApi.create(
          {
            visitId,

            partnerApiClientId:
              partnerId,

            warehouseId,

            transportCode,

            expectedDeliveryAt:
              expectedDeliveryAt
                ? new Date(
                    expectedDeliveryAt,
                  ).toISOString()
                : undefined,

            note:
              note.trim() ||
              undefined,
          },
        );

      if (publish) {
        try {
          await handoverApi.publish(
            created.id,
          );
        } catch {
          /*
           * Draft đã tạo thành công.
           * Không gọi create lần nữa.
           * Chuyển detail để user
           * có thể Publish lại an toàn.
           */
          navigate(
            `/handovers/${encodeURIComponent(
              created.id,
            )}?publishFailed=1`,
            {
              replace: true,
            },
          );

          return;
        }
      }

      navigate(
        `/handovers/${encodeURIComponent(
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

  function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    void create(false);
  }

  if (loading) {
    return (
      <div className="handover-state">
        <div className="handover-spinner" />

        <strong>
          Đang tải dữ liệu Handover
        </strong>
      </div>
    );
  }

  return (
    <div className="handover-create-page">
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

      <div className="handover-create-heading">
        <span>
          NEW TRANSPORT HANDOVER
        </span>

        <h2>
          Tạo bàn giao vận chuyển
        </h2>

        <p>
          Handover là lifecycle sau/
          ngoài core ICD. Container
          Visit vẫn giữ nguyên trạng
          thái EXITED.
        </p>
      </div>

      {error && (
        <div className="handover-message handover-message--error">
          <strong>!</strong>

          {error}
        </div>
      )}

      <form
        className="handover-create-form"
        onSubmit={
          handleSubmit
        }
      >
        <section className="handover-card">
          <div className="handover-card__heading">
            <span>
              CORE ICD
            </span>

            <h3>
              Container đã Gate-out
            </h3>
          </div>

          <label className="handover-field">
            <span>
              Container Visit *
            </span>

            <select
              value={visitId}
              disabled={
                submitting
              }
              onChange={(
                event,
              ) =>
                setVisitId(
                  event.target
                    .value,
                )
              }
            >
              <option value="">
                Chọn container
              </option>

              {containers.map(
                (container) => (
                  <option
                    key={
                      container.visitId
                    }
                    value={
                      container.visitId
                    }
                  >
                    {
                      container.containerNumber
                    }
                    {' · '}
                    {
                      container.status
                    }
                  </option>
                ),
              )}
            </select>
          </label>

          {selectedContainer && (
            <div className="handover-container-preview">
              <strong>
                {
                  selectedContainer.containerNumber
                }
              </strong>

              <span>
                {[
                  selectedContainer.size,
                  selectedContainer.type,
                  selectedContainer.consigneeName,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>

              <b>
                {
                  selectedContainer.status
                }
              </b>
            </div>
          )}
        </section>

        <section className="handover-card">
          <div className="handover-card__heading">
            <span>
              PARTNER
            </span>

            <h3>
              Đối tác & kho nhận
            </h3>
          </div>

          <div className="handover-form-grid">
            <label className="handover-field">
              <span>
                Partner *
              </span>

              {options.partners.length >
              0 ? (
                <select
                  value={
                    partnerId
                  }
                  disabled={
                    submitting
                  }
                  onChange={(
                    event,
                  ) =>
                    setPartnerId(
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    Chọn Partner
                  </option>

                  {options.partners.map(
                    (partner) => (
                      <option
                        key={
                          partner.id
                        }
                        value={
                          partner.id
                        }
                      >
                        {partner.code
                          ? `${partner.code} · `
                          : ''}
                        {
                          partner.name
                        }
                      </option>
                    ),
                  )}
                </select>
              ) : (
                <input
                  value={
                    partnerId
                  }
                  disabled={
                    submitting
                  }
                  placeholder="Partner API Client ID"
                  onChange={(
                    event,
                  ) =>
                    setPartnerId(
                      event.target
                        .value,
                    )
                  }
                />
              )}
            </label>

            <label className="handover-field">
              <span>
                Kho đích *
              </span>

              {options.warehouses
                .length > 0 ? (
                <select
                  value={
                    warehouseId
                  }
                  disabled={
                    submitting
                  }
                  onChange={(
                    event,
                  ) =>
                    setWarehouseId(
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    Chọn Customer Warehouse
                  </option>

                  {options.warehouses.map(
                    (warehouse) => (
                      <option
                        key={
                          warehouse.id
                        }
                        value={
                          warehouse.id
                        }
                      >
                        {warehouse.code
                          ? `${warehouse.code} · `
                          : ''}
                        {
                          warehouse.name
                        }
                      </option>
                    ),
                  )}
                </select>
              ) : (
                <input
                  value={
                    warehouseId
                  }
                  disabled={
                    submitting
                  }
                  placeholder="Customer Warehouse ID"
                  onChange={(
                    event,
                  ) =>
                    setWarehouseId(
                      event.target
                        .value,
                    )
                  }
                />
              )}
            </label>
          </div>

          {(options.partners.length ===
            0 ||
            options.warehouses
              .length === 0) && (
            <div className="handover-option-warning">
              Catalog read-only không
              khả dụng với quyền hiện
              tại. Backend vẫn kiểm
              tra Partner ACTIVE và
              Warehouse ACTIVE khi
              tạo Handover.
            </div>
          )}
        </section>

        <section className="handover-card">
          <div className="handover-card__heading">
            <span>
              DELIVERY
            </span>

            <h3>
              Thông tin vận chuyển
            </h3>
          </div>

          <div className="handover-form-grid">
            <label className="handover-field">
              <span>
                Transport Code *
              </span>

              <input
                value={
                  transportCode
                }
                disabled={
                  submitting
                }
                placeholder="VC-2026-001"
                onChange={(
                  event,
                ) =>
                  setTransportCode(
                    event.target
                      .value
                      .toUpperCase(),
                  )
                }
              />
            </label>

            <label className="handover-field">
              <span>
                Expected Delivery
              </span>

              <input
                type="datetime-local"
                value={
                  expectedDeliveryAt
                }
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) =>
                  setExpectedDeliveryAt(
                    event.target
                      .value,
                  )
                }
              />
            </label>

            <label className="handover-field handover-field--full">
              <span>
                Ghi chú
              </span>

              <textarea
                rows={4}
                value={note}
                disabled={
                  submitting
                }
                onChange={(
                  event,
                ) =>
                  setNote(
                    event.target
                      .value,
                  )
                }
              />
            </label>
          </div>
        </section>

        <section className="handover-core-boundary">
          <strong>
            Core isolation
          </strong>

          <span>
            Publish Handover không
            thay đổi Container Visit,
            Yard, Billing, Gate Pass
            hoặc lịch sử Gate-out.
          </span>
        </section>

        <div className="handover-create-actions">
          <button
            type="button"
            disabled={
              submitting
            }
            onClick={() =>
              navigate(
                '/handovers',
              )
            }
          >
            Hủy
          </button>

          <button
            type="submit"
            disabled={
              submitting
            }
          >
            Lưu nháp
          </button>

          <button
            type="button"
            className="handover-primary-button"
            disabled={
              submitting
            }
            onClick={() => {
              void create(true);
            }}
          >
            {submitting
              ? 'Đang xử lý...'
              : 'Lưu & Sẵn sàng bàn giao'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default HandoverCreatePage;
