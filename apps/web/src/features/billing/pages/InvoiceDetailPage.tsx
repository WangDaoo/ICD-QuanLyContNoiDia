import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  billingApi,
} from '../api/billing.api';

import type {
  BillingInvoice,
  CreatePaymentInput,
  PaymentMethod,
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

  return 'Không thể xử lý Invoice.';
}

export function InvoiceDetailPage() {
  const params =
    useParams<{
      invoiceId: string;
    }>();

  const [
    searchParams,
  ] =
    useSearchParams();

  const navigate =
    useNavigate();

  const invoiceId =
    params.invoiceId;

  const visitId =
    searchParams.get(
      'visitId',
    );

  const [
    invoice,
    setInvoice,
  ] =
    useState<
      BillingInvoice | null
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
    amount,
    setAmount,
  ] = useState('');

  const [
    method,
    setMethod,
  ] =
    useState<PaymentMethod>(
      'BANK_TRANSFER',
    );

  const [
    notes,
    setNotes,
  ] = useState('');

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
        if (!invoiceId) {
          return;
        }

        try {
          setLoading(true);
          setError(null);

          if (!visitId) {
            setError(
              'Thiếu visitId để đối chiếu Invoice.',
            );
            return;
          }

          const snapshot =
            await billingApi.getBilling(
              visitId,
            );

          const found =
            snapshot.invoices.find(
              (item) =>
                item.id ===
                invoiceId,
            );

          if (!found) {
            setError(
              `Không tìm thấy Invoice ${invoiceId}.`,
            );
            return;
          }

          setInvoice(found);
          setAmount(
            found.balanceAmount > 0
              ? String(
                  found.balanceAmount,
                )
              : '',
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
      [
        invoiceId,
        visitId,
      ],
    );

  useEffect(() => {
    void load();
  }, [load]);

  async function submitPayment(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (
      !invoiceId ||
      !invoice
    ) {
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(
        numericAmount,
      ) ||
      numericAmount <= 0
    ) {
      setError(
        'Số tiền thanh toán không hợp lệ.',
      );
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(null);

      const input: CreatePaymentInput =
        {
          amount:
            numericAmount,

          method,

          notes:
            notes.trim() ||
            undefined,
        };

      await billingApi.recordPayment(
        invoiceId,
        input,
      );

      setSuccess(
        `Thanh toán ${formatCurrency(
          numericAmount,
        )} thành công.`,
      );

      await load();
    } catch (
      paymentError
    ) {
      setError(
        getErrorMessage(
          paymentError,
        ),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="billing-state">
        <div className="billing-spinner" />

        <strong>
          Đang tải Invoice
        </strong>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="billing-state">
        <strong>
          Không có dữ liệu
          Invoice
        </strong>

        <span>
          {error ??
            'Invoice không tồn tại.'}
        </span>

        {visitId && (
          <button
            type="button"
            onClick={() =>
              navigate(
                `/billing/${encodeURIComponent(
                  visitId,
                )}`,
              )
            }
          >
            ← Quay lại Billing
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="billing-invoice-page">
      <div className="billing-invoice-toolbar">
        <button
          type="button"
          onClick={() => {
            if (visitId) {
              navigate(
                `/billing/${encodeURIComponent(
                  visitId,
                )}`,
              );
            } else {
              navigate(
                '/billing',
              );
            }
          }}
        >
          ← Chi tiết Billing
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
            INVOICE
          </span>

          <h2>
            {invoice.invoiceNumber ??
              invoice.id}
          </h2>

          <p>
            Service Order:{' '}
            {invoice.serviceOrderId ??
              '—'}
          </p>
        </div>

        <div>
          <span>
            TRẠNG THÁI
          </span>

          <span
            className={`billing-status billing-status--${invoice.status.toLowerCase()}`}
          >
            {invoice.status}
          </span>
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
            TỔNG TIỀN
          </span>

          <strong>
            {formatCurrency(
              invoice.totalAmount,
            )}
          </strong>
        </article>

        <article>
          <span>
            ĐÃ THANH TOÁN
          </span>

          <strong className="billing-money--paid">
            {formatCurrency(
              invoice.paidAmount,
            )}
          </strong>
        </article>

        <article>
          <span>
            CÒN LẠI
          </span>

          <strong className="billing-money--debt">
            {formatCurrency(
              invoice.balanceAmount,
            )}
          </strong>
        </article>
      </section>

      <section className="billing-panel">
        <div className="billing-panel__heading">
          <div>
            <span>
              CHI TIẾT DỊCH VỤ
            </span>

            <h3>
              Các mục thanh toán
            </h3>
          </div>
        </div>

        <div className="billing-table-wrapper">
          <table className="billing-table">
            <thead>
              <tr>
                <th>
                  DỊCH VỤ
                </th>

                <th>
                  SỐ LƯỢNG
                </th>

                <th>
                  ĐƠN GIÁ
                </th>

                <th>
                  THÀNH TIỀN
                </th>
              </tr>
            </thead>

            <tbody>
              {invoice.lines.map(
                (line) => (
                  <tr
                    key={
                      line.id
                    }
                  >
                    <td>
                      <strong>
                        {
                          line.serviceCode
                        }
                      </strong>

                      {line.description && (
                        <span>
                          {' — '}
                          {
                            line.description
                          }
                        </span>
                      )}
                    </td>

                    <td>
                      {
                        line.quantity
                      }
                      {line.unit
                        ? ` ${line.unit}`
                        : ''}
                    </td>

                    <td>
                      {formatCurrency(
                        line.unitPrice,
                      )}
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(
                          line.amount,
                        )}
                      </strong>
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="billing-invoice-grid">
        <div className="billing-panel">
          <div className="billing-panel__heading">
            <div>
              <span>
                LỊCH SỬ
              </span>

              <h3>
                Lịch sử thanh toán
              </h3>
            </div>
          </div>

          {invoice.payments
            .length === 0 ? (
            <div className="billing-empty-small">
              Chưa có thanh toán nào
              được ghi nhận.
            </div>
          ) : (
            <div className="billing-payment-list">
              {invoice.payments.map(
                (payment) => (
                  <article
                    key={
                      payment.id
                    }
                  >
                    <div>
                      <strong>
                        {formatCurrency(
                          payment.amount,
                        )}
                      </strong>

                      <span>
                        {[
                          payment.method,
                          formatDate(
                            payment.paidAt,
                          ),
                          payment.createdByName,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            ' · ',
                          )}
                      </span>

                      {payment.notes && (
                        <p>
                          {
                            payment.notes
                          }
                        </p>
                      )}
                    </div>
                  </article>
                ),
              )}
            </div>
          )}
        </div>

        {invoice.balanceAmount >
          0 && (
          <div className="billing-panel">
            <div className="billing-panel__heading">
              <div>
                <span>
                  THU TIỀN
                </span>

                <h3>
                  Ghi nhận thanh
                  toán
                </h3>
              </div>
            </div>

            <form
              onSubmit={(
                e,
              ) => {
                void submitPayment(
                  e,
                );
              }}
              className="billing-payment-form"
            >
              <div>
                <label htmlFor="amount-input">
                  Số tiền (VND)
                </label>

                <input
                  id="amount-input"
                  type="number"
                  min="1"
                  max={
                    invoice.balanceAmount
                  }
                  required
                  value={
                    amount
                  }
                  onChange={(
                    e,
                  ) =>
                    setAmount(
                      e
                        .target
                        .value,
                    )
                  }
                />
              </div>

              <div>
                <label htmlFor="method-select">
                  Phương thức
                </label>

                <select
                  id="method-select"
                  value={
                    method
                  }
                  onChange={(
                    e,
                  ) =>
                    setMethod(
                      e
                        .target
                        .value as PaymentMethod,
                    )
                  }
                >
                  <option value="BANK_TRANSFER">
                    Chuyển khoản (Bank
                    Transfer)
                  </option>

                  <option value="CASH">
                    Tiền mặt (Cash)
                  </option>

                  <option value="OTHER">
                    Khác (Other)
                  </option>
                </select>
              </div>

              <div>
                <label htmlFor="notes-input">
                  Ghi chú
                </label>

                <textarea
                  id="notes-input"
                  rows={2}
                  placeholder="Mã giao dịch / tham chiếu..."
                  value={
                    notes
                  }
                  onChange={(
                    e,
                  ) =>
                    setNotes(
                      e
                        .target
                        .value,
                    )
                  }
                />
              </div>

              <button
                type="submit"
                className="billing-primary-btn"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? 'Đang xử lý...'
                  : 'Xác nhận thu tiền'}
              </button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}

export default InvoiceDetailPage;
