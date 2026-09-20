import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
} from 'react-router-dom';

import {
  containerApi,
} from '../../containers/api/container.api';

import {
  movementOrderApi,
} from '../api/movement-order.api';

import type {
  MovementOrderWorkspaceItem,
} from '../movement-order.types';

import './MovementOrderPage.css';

type ModalState = {
  item:
    MovementOrderWorkspaceItem;

  mode:
    | 'CREATE'
    | 'AUTHORIZE';
} | null;

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

  return 'Không thể xử lý Movement Order.';
}

function getStatusLabel(
  status: string,
): string {
  switch (
    status.toUpperCase()
  ) {
    case 'PENDING':
      return 'Chờ Movement Order';

    case 'AUTHORIZED':
      return 'Đã ủy quyền';

    default:
      return status;
  }
}

function getStatusTone(
  status: string,
): string {
  return status ===
    'AUTHORIZED'
    ? 'authorized'
    : 'pending';
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

export function MovementOrderPage() {
  const [
    items,
    setItems,
  ] =
    useState<
      MovementOrderWorkspaceItem[]
    >([]);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      | 'ALL'
      | 'PENDING'
      | 'AUTHORIZED'
    >('ALL');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

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

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    modal,
    setModal,
  ] =
    useState<ModalState>(
      null,
    );

  const load =
    useCallback(
      async (
        refresh = false,
      ) => {
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

          const containers =
            await containerApi.list();

          /*
           * Movement Order chỉ thuộc
           * giai đoạn trước Gate-in.
           *
           * PENDING:
           * chưa authorize.
           *
           * AUTHORIZED:
           * đã đủ điều kiện chuyển
           * sang Truck Visit / Gate-in.
           */
          const workspaceItems =
            containers
              .filter(
                (container) =>
                  container.status ===
                    'PENDING' ||
                  container.status ===
                    'AUTHORIZED',
              )
              .map(
                (
                  container,
                ): MovementOrderWorkspaceItem => ({
                  visitId:
                    container.visitId,

                  containerNumber:
                    container.containerNumber,

                  containerStatus:
                    container.status,

                  size:
                    container.size,

                  type:
                    container.type,

                  isoCode:
                    container.isoCode,

                  consigneeName:
                    container.consigneeName,

                  hblNumber:
                    container.hblNumber,

                  mblNumber:
                    container.mblNumber,

                  createdAt:
                    container.createdAt,
                }),
              );

          setItems(
            workspaceItems,
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
      [],
    );

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems =
    useMemo(() => {
      const needle =
        search
          .trim()
          .toUpperCase();

      return items.filter(
        (item) => {
          if (
            statusFilter !==
              'ALL' &&
            item.containerStatus !==
              statusFilter
          ) {
            return false;
          }

          if (!needle) {
            return true;
          }

          return [
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
          );
        },
      );
    }, [
      items,
      search,
      statusFilter,
    ]);

  const stats =
    useMemo(
      () => ({
        total:
          items.length,

        pending:
          items.filter(
            (item) =>
              item.containerStatus ===
              'PENDING',
          ).length,

        authorized:
          items.filter(
            (item) =>
              item.containerStatus ===
              'AUTHORIZED',
          ).length,
      }),
      [items],
    );

  async function handleCreateAndAuthorize(
    item:
      MovementOrderWorkspaceItem,
  ) {
    try {
      setActionLoading(true);
      setError(null);
      setSuccessMessage(
        null,
      );

      const result =
        await movementOrderApi.createAndAuthorize(
          item.visitId,
        );

      setModal(null);

      setSuccessMessage(
        `Đã tạo và authorize Movement Order cho container ${item.containerNumber} (${result.id}).`,
      );

      await load(true);
    } catch (
      actionError
    ) {
      setError(
        getErrorMessage(
          actionError,
        ),
      );
    } finally {
      setActionLoading(false);
    }
  }

  if (
    loading &&
    items.length === 0
  ) {
    return (
      <div className="movement-order-state">
        <div className="movement-order-spinner" />

        <strong>
          Đang tải Movement
          Orders
        </strong>

        <span>
          Đang kiểm tra các
          Container Visit trước
          Gate-in...
        </span>
      </div>
    );
  }

  if (
    error &&
    items.length === 0
  ) {
    return (
      <div className="movement-order-state">
        <div className="movement-order-error-icon">
          !
        </div>

        <strong>
          Không thể tải Movement
          Orders
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

  return (
    <div className="movement-order-page">
      <div className="movement-order-toolbar">
        <div>
          <h2>
            Movement Orders
          </h2>

          <p>
            Quản lý quyền vận
            chuyển container về
            ICD trước khi Gate-in.
          </p>
        </div>

        <button
          type="button"
          className="movement-order-refresh"
          disabled={
            refreshing
          }
          onClick={() => {
            void load(true);
          }}
        >
          <span
            className={
              refreshing
                ? 'movement-order-refresh__icon movement-order-refresh__icon--spin'
                : 'movement-order-refresh__icon'
            }
          >
            ↻
          </span>

          {refreshing
            ? 'Đang tải'
            : 'Làm mới'}
        </button>
      </div>

      {error && (
        <div className="movement-order-inline-message movement-order-inline-message--error">
          <strong>!</strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {successMessage && (
        <div className="movement-order-inline-message movement-order-inline-message--success">
          <strong>✓</strong>

          <span>
            {
              successMessage
            }
          </span>
        </div>
      )}

      <section className="movement-order-lifecycle">
        <div className="movement-order-lifecycle__step movement-order-lifecycle__step--active">
          <span>1</span>

          <div>
            <strong>
              PENDING
            </strong>

            <small>
              Container Visit đã
              được tạo
            </small>
          </div>
        </div>

        <div className="movement-order-lifecycle__line" />

        <div className="movement-order-lifecycle__step movement-order-lifecycle__step--active">
          <span>2</span>

          <div>
            <strong>
              MOVEMENT ORDER
            </strong>

            <small>
              Tạo và authorize
              lệnh vận chuyển
            </small>
          </div>
        </div>

        <div className="movement-order-lifecycle__line" />

        <div className="movement-order-lifecycle__step">
          <span>3</span>

          <div>
            <strong>
              AUTHORIZED
            </strong>

            <small>
              Sẵn sàng Truck Visit
              / Gate-in
            </small>
          </div>
        </div>
      </section>

      <section className="movement-order-stats">
        <article>
          <span>
            TRƯỚC GATE-IN
          </span>

          <strong>
            {stats.total}
          </strong>

          <small>
            Container Visit đang
            trong workflow
          </small>
        </article>

        <article className="movement-order-stat--warning">
          <span>
            CHỜ ỦY QUYỀN
          </span>

          <strong>
            {stats.pending}
          </strong>

          <small>
            Cần Movement Order
          </small>
        </article>

        <article className="movement-order-stat--success">
          <span>
            ĐÃ ỦY QUYỀN
          </span>

          <strong>
            {stats.authorized}
          </strong>

          <small>
            Có thể tiếp tục
            Gate-in
          </small>
        </article>
      </section>

      <section className="movement-order-panel">
        <div className="movement-order-filterbar">
          <div className="movement-order-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Container, HBL, MBL, consignee..."
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

          <select
            value={
              statusFilter
            }
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event.target
                  .value as
                  | 'ALL'
                  | 'PENDING'
                  | 'AUTHORIZED',
              )
            }
          >
            <option value="ALL">
              Tất cả
            </option>

            <option value="PENDING">
              Chờ ủy quyền
            </option>

            <option value="AUTHORIZED">
              Đã ủy quyền
            </option>
          </select>

          <span className="movement-order-result-count">
            {
              filteredItems.length
            }
            {' / '}
            {items.length}
            {' container'}
          </span>
        </div>

        {filteredItems.length ===
        0 ? (
          <div className="movement-order-empty">
            <span>⇄</span>

            <strong>
              Không có Movement
              Order cần xử lý
            </strong>

            <small>
              Không có Container
              Visit phù hợp với bộ
              lọc hiện tại.
            </small>
          </div>
        ) : (
          <div className="movement-order-table-wrapper">
            <table className="movement-order-table">
              <thead>
                <tr>
                  <th>
                    CONTAINER
                  </th>

                  <th>
                    TRẠNG THÁI
                  </th>

                  <th>
                    SIZE / TYPE
                  </th>

                  <th>
                    CONSIGNEE
                  </th>

                  <th>
                    HBL
                  </th>

                  <th>
                    MBL
                  </th>

                  <th>
                    CREATED
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredItems.map(
                  (item) => (
                    <tr
                      key={
                        item.visitId
                      }
                    >
                      <td>
                        <Link
                          to={`/containers/${encodeURIComponent(
                            item.visitId,
                          )}`}
                          className="movement-order-container"
                        >
                          {
                            item.containerNumber
                          }
                        </Link>

                        {item.isoCode && (
                          <small>
                            {
                              item.isoCode
                            }
                          </small>
                        )}
                      </td>

                      <td>
                        <span
                          className={[
                            'movement-order-status',
                            `movement-order-status--${getStatusTone(
                              item.containerStatus,
                            )}`,
                          ].join(
                            ' ',
                          )}
                        >
                          {getStatusLabel(
                            item.containerStatus,
                          )}
                        </span>
                      </td>

                      <td>
                        {[
                          item.size,
                          item.type,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            ' · ',
                          ) ||
                          '—'}
                      </td>

                      <td>
                        {item.consigneeName ??
                          '—'}
                      </td>

                      <td>
                        {item.hblNumber ??
                          '—'}
                      </td>

                      <td>
                        {item.mblNumber ??
                          '—'}
                      </td>

                      <td>
                        {formatDateTime(
                          item.createdAt,
                        )}
                      </td>

                      <td>
                        {item.containerStatus ===
                        'PENDING' ? (
                          <button
                            type="button"
                            className="movement-order-authorize-button"
                            onClick={() =>
                              setModal({
                                item,

                                mode:
                                  'CREATE',
                              })
                            }
                          >
                            Tạo & ủy quyền
                          </button>
                        ) : (
                          <Link
                            to={`/gate-in?visitId=${encodeURIComponent(
                              item.visitId,
                            )}`}
                            className="movement-order-gate-link"
                          >
                            Sang Gate-in →
                          </Link>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="movement-order-note">
        <strong>
          Lưu ý nghiệp vụ
        </strong>

        <p>
          Movement Order hợp lệ là
          điều kiện trước Gate-in.
          Việc tạo hoặc authorize
          không được thực hiện chỉ
          bằng cách sửa trạng thái
          Container Visit ở frontend;
          toàn bộ validation nằm ở
          backend.
        </p>
      </section>

      {modal && (
        <div
          className="movement-order-modal-backdrop"
          role="presentation"
          onMouseDown={(
            event,
          ) => {
            if (
              event.target ===
                event.currentTarget &&
              !actionLoading
            ) {
              setModal(null);
            }
          }}
        >
          <div
            className="movement-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="movement-order-modal-title"
          >
            <div className="movement-order-modal__heading">
              <div>
                <span>
                  MOVEMENT ORDER
                </span>

                <h3 id="movement-order-modal-title">
                  Xác nhận tạo và
                  ủy quyền
                </h3>
              </div>

              <button
                type="button"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setModal(null)
                }
              >
                ×
              </button>
            </div>

            <div className="movement-order-modal__container">
              <span>
                CONTAINER
              </span>

              <strong>
                {
                  modal.item
                    .containerNumber
                }
              </strong>

              <small>
                {[
                  modal.item
                    .size,
                  modal.item
                    .type,
                  modal.item
                    .isoCode,
                ]
                  .filter(
                    Boolean,
                  )
                  .join(
                    ' · ',
                  )}
              </small>
            </div>

            <div className="movement-order-modal__flow">
              <div>
                <span>1</span>

                <p>
                  Tạo Movement
                  Order trạng thái
                  DRAFT.
                </p>
              </div>

              <div>
                <span>2</span>

                <p>
                  Backend kiểm tra
                  điều kiện
                  authorize.
                </p>
              </div>

              <div>
                <span>3</span>

                <p>
                  Container Visit
                  chuyển sang
                  AUTHORIZED nếu
                  hợp lệ.
                </p>
              </div>
            </div>

            <div className="movement-order-modal__warning">
              <strong>
                Thao tác nghiệp vụ
              </strong>

              <span>
                Sau khi authorize,
                container có thể
                tiếp tục quy trình
                Truck Visit và
                Gate-in.
              </span>
            </div>

            <div className="movement-order-modal__actions">
              <button
                type="button"
                className="movement-order-modal__cancel"
                disabled={
                  actionLoading
                }
                onClick={() =>
                  setModal(null)
                }
              >
                Hủy
              </button>

              <button
                type="button"
                className="movement-order-modal__confirm"
                disabled={
                  actionLoading
                }
                onClick={() => {
                  void handleCreateAndAuthorize(
                    modal.item,
                  );
                }}
              >
                {actionLoading
                  ? 'Đang xử lý...'
                  : 'Tạo & ủy quyền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MovementOrderPage;
