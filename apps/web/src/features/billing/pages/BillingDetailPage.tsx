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
} from '../../containers/api/container.api';

import type {
  ContainerDetail,
} from '../../containers/container.types';

import {
  billingApi,
} from '../api/billing.api';

import type {
  BillingSnapshot,
  ServiceOrder,
} from '../billing.types';

import './Billing.css';

function formatCurrency(
  value: number,
): string {
  return new Intl.NumberFormat(
    'vi-VN',
    {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function formatDate(
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

  return date.toLocaleDateString(
    'vi-VN',
  );
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
  }

  if (
    error instanceof Error
  ) {
    return error.message;
  }

  return 'Không thể xử lý Billing.';
}

export function BillingDetailPage() {
  const params =
    useParams<{
      visitId: string;
    }>();

  const navigate =
    useNavigate();

  const visitId =
    params.visitId;

  const [
    container,
    setContainer,
  ] =
    useState<
      ContainerDetail | null
    >(null);

  const [
    billing,
    setBilling,
  ] =
    useState<
      BillingSnapshot | null
    >(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    actionId,
    setActionId,
  ] =
    useState<
      string | null
    >(null);

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
            billingResult,
          ] =
            await Promise.all([
              containerApi.getDetail(
                visitId,
              ),

              billingApi.getBilling(
                visitId,
              ),
            ]);

          setContainer(
            containerResult,
          );

          setBilling(
            billingResult,
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

  async function mutate(
    id: string,
    callback:
      () => Promise<void>,
    message: string,
  ) {
    try {
      setActionId(id);
      setError(null);
      setSuccess(null);

      await callback();

      setSuccess(message);

      await load();
    } catch (
      mutationError
    ) {
      setError(
        getErrorMessage(
          mutationError,
        ),
      );
    } finally {
      setActionId(null);
    }
  }

  function confirmOrder(
    order: ServiceOrder,
  ) {
    void mutate(
      order.id,

      () =>
        billingApi.confirmServiceOrder(
          order.id,
        ),

      `Service Order ${
        order.orderNumber ??
        order.id
      } đã CONFIRMED.`,
    );
  }

  function invoiceOrder(
    order: ServiceOrder,
  ) {
    void mutate(
      order.id,

      () =>
        billingApi.createInvoice(
          order.id,
        ),

      `Đã tạo Invoice cho Service Order ${
        order.orderNumber ??
        order.id
      }.`,
    );
  }

  if (
    loading &&
    !billing
  ) {
    return (
      <div className="billing-state">
        <div className="billing-spinner" />

        <strong>
          Đang tải Billing Detail
        </strong>
      </div>
    );
  }

  if (
    error &&
    !billing
  ) {
    return (
      <div className="billing-state">
        <strong>
          Không thể tải Billing
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
    !billing ||
    !container ||
    !visitId
  ) {
    return null;
  }

  return (
    <div className="billing-detail-page">
      <div className="billing-detail-toolbar">
        <button
          type="button"
          onClick={() =>
            navigate(
              '/billing',
            )
          }
        >
          ← Billing
        </button>

        <button
          type="button"
          onClick={() => {
            void load();
          }}
        >
          ↻ Làm mới
        </button>
      </div>

      <section className="billing-hero">
        <div>
          <span>
            BILLING OVERVIEW
          </span>

          <h2>
            {
              container.containerNumber
            }
          </h2>

          <p>
            {container.consignee
              ?.name ??
              billing.consigneeName ??
              '—'}
          </p>
        </div>

        <div>
          <span>
            CONTAINER STATUS
          </span>

          <strong>
            {
              container.status
            }
          </strong>
        </div>
      </section>

      {error && (
        <div className="billing-message billing-message--error">
          <strong>!</strong>
          {error}
        </div>
      )}

      {success && (
        <div className="billing-message billing-message--success">
          <strong>✓</strong>
          {success}
        </div>
      )}

      <section className="billing-kpis">
        <article>
          <span>
            TỔNG HÓA ĐƠN
          </span>

          <strong>
            {formatCurrency(
              billing.totalCharges,
            )}
          </strong>
        </article>

        <article>
          <span>
            ĐÃ THANH TOÁN
          </span>

          <strong className="billing-money--paid">
            {formatCurrency(
              billing.totalPaid,
            )}
          </strong>
        </article>

        <article>
          <span>
            CÒN LẠI
          </span>

          <strong className="billing-money--debt">
            {formatCurrency(
              billing.outstandingAmount,
            )}
          </strong>
        </article>

        <article>
          <span>
            CHƯA BILL
          </span>

          <strong>
            {formatCurrency(
              billing.unbilledAmount,
            )}
          </strong>
        </article>
      </section>

      <section className="billing-panel">
        <div className="billing-panel__heading">
          <div>
            <span>
              UNBILLED SERVICES
            </span>

            <h3>
              Dịch vụ chưa lập
              Service Order
            </h3>
          </div>

          <Link
            to={`/billing/${encodeURIComponent(
              visitId,
            )}/service-order/new`}
            className="billing-primary-link"
          >
            + Tạo Service Order
          </Link>
        </div>

        {billing.billableServices
          .length === 0 ? (
          <div className="billing-empty-small">
            Backend chưa trả dịch vụ
            unbilled hoặc hiện không còn
            dịch vụ cần bill.
          </div>
        ) : (
          <div className="billing-service-grid">
            {billing.billableServices.map(
              (service) => (
                <article
                  key={
                    service.serviceCode
                  }
                >
                  <strong>
                    {
                      service.serviceCode
                    }
                  </strong>

                  <span>
                    Completed:{' '}
                    {
                      service.cumulativeQuantity
                    }
                  </span>

                  <span>
                    Đã bill:{' '}
                    {
                      service.billedQuantity
                    }
                  </span>

                  <b>
                    Chưa bill:{' '}
                    {
                      service.unbilledQuantity
                    }
                  </b>
                </article>
              ),
            )}
          </div>
        )}
      </section>

      <section className="billing-panel">
        <div className="billing-panel__heading">
          <div>
            <span>
              SERVICE ORDERS
            </span>

            <h3>
              Service Order
            </h3>
          </div>

          <strong>
            {
              billing.serviceOrders
                .length
            }
          </strong>
        </div>

        {billing.serviceOrders.length ===
        0 ? (
          <div className="billing-empty-small">
            Chưa có Service Order.
          </div>
        ) : (
          <div className="billing-table-wrapper">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>
                    SERVICE ORDER
                  </th>

                  <th>
                    TRẠNG THÁI
                  </th>

                  <th>
                    DỊCH VỤ
                  </th>

                  <th>
                    TỔNG
                  </th>

                  <th>
                    CREATED
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {billing.serviceOrders.map(
                  (order) => (
                    <tr
                      key={
                        order.id
                      }
                    >
                      <td>
                        <strong>
                          {order.orderNumber ??
                            order.id}
                        </strong>

                        {order.isSupplemental && (
                          <small>
                            Supplemental
                          </small>
                        )}
                      </td>

                      <td>
                        <span
                          className={`billing-status billing-status--${order.status.toLowerCase()}`}
                        >
                          {
                            order.status
                          }
                        </span>
                      </td>

                      <td>
                        {order.lines
                          .map(
                            (line) =>
                              `${line.serviceCode} × ${line.quantity}`,
                          )
                          .join(
                            ', ',
                          ) ||
                          '—'}
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            order.totalAmount,
                          )}
                        </strong>
                      </td>

                      <td>
                        {formatDate(
                          order.createdAt,
                        )}
                      </td>

                      <td>
                        <div className="billing-row-actions">
                          {order.status ===
                            'DRAFT' && (
                            <button
                              type="button"
                              disabled={
                                actionId ===
                                order.id
                              }
                              onClick={() =>
                                confirmOrder(
                                  order,
                                )
                              }
                            >
                              Confirm
                            </button>
                          )}

                          {order.status ===
                            'CONFIRMED' &&
                            !order.invoiceId && (
                            <button
                              type="button"
                              disabled={
                                actionId ===
                                order.id
                              }
                              onClick={() =>
                                invoiceOrder(
                                  order,
                                )
                              }
                            >
                              Tạo Invoice
                            </button>
                          )}

                          {order.invoiceId && (
                            <Link
                              to={`/invoices/${encodeURIComponent(
                                order.invoiceId,
                              )}?visitId=${encodeURIComponent(
                                visitId,
                              )}`}
                            >
                              Invoice →
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="billing-panel">
        <div className="billing-panel__heading">
          <div>
            <span>
              INVOICES
            </span>

            <h3>
              Hóa đơn & thanh toán
            </h3>
          </div>

          <strong>
            {
              billing.invoices
                .length
            }
          </strong>
        </div>

        {billing.invoices.length ===
        0 ? (
          <div className="billing-empty-small">
            Chưa có Invoice.
          </div>
        ) : (
          <div className="billing-table-wrapper">
            <table className="billing-table">
              <thead>
                <tr>
                  <th>
                    INVOICE
                  </th>

                  <th>
                    TRẠNG THÁI
                  </th>

                  <th>
                    TOTAL
                  </th>

                  <th>
                    PAID
                  </th>

                  <th>
                    CÒN LẠI
                  </th>

                  <th>
                    HẠN TT
                  </th>

                  <th />
                </tr>
              </thead>

              <tbody>
                {billing.invoices.map(
                  (invoice) => (
                    <tr
                      key={
                        invoice.id
                      }
                    >
                      <td>
                        <strong>
                          {invoice.invoiceNumber ??
                            invoice.id}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`billing-status billing-status--${invoice.status.toLowerCase()}`}
                        >
                          {
                            invoice.status
                          }
                        </span>
                      </td>

                      <td>
                        {formatCurrency(
                          invoice.totalAmount,
                        )}
                      </td>

                      <td className="billing-money--paid">
                        {formatCurrency(
                          invoice.paidAmount,
                        )}
                      </td>

                      <td className="billing-money--debt">
                        {formatCurrency(
                          invoice.balanceAmount,
                        )}
                      </td>

                      <td>
                        {formatDate(
                          invoice.dueDate,
                        )}
                      </td>

                      <td>
                        <Link
                          className="billing-open-link"
                          to={`/invoices/${encodeURIComponent(
                            invoice.id,
                          )}?visitId=${encodeURIComponent(
                            visitId,
                          )}`}
                        >
                          Chi tiết →
                        </Link>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default BillingDetailPage;
