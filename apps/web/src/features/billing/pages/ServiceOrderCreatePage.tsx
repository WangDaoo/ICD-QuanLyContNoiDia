import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
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
} from '../billing.types';

import './Billing.css';

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

  return 'Không thể tạo Service Order.';
}

export function ServiceOrderCreatePage() {
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

  async function submit(
    event: React.FormEvent,
  ) {
    event.preventDefault();

    if (!visitId) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await billingApi.createServiceOrder(
        visitId,
      );

      navigate(
        `/billing/${encodeURIComponent(
          visitId,
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

  if (loading) {
    return (
      <div className="billing-state">
        <div className="billing-spinner" />

        <strong>
          Đang tải dữ liệu
          Service Order
        </strong>
      </div>
    );
  }

  if (
    !visitId ||
    !container ||
    !billing
  ) {
    return null;
  }

  return (
    <div className="billing-form-page">
      <div className="billing-form-toolbar">
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
          ← Chi tiết Billing
        </button>
      </div>

      <div className="billing-form-card">
        <h2>
          Tạo Service Order
        </h2>

        <p>
          Backend sẽ tự động kết
          xuất các tác vụ hoàn
          tất chưa lập hóa đơn
          để tạo Service Order.
        </p>

        {error && (
          <div className="billing-message billing-message--error">
            <strong>!</strong>
            {error}
          </div>
        )}

        <form
          onSubmit={(e) => {
            void submit(e);
          }}
        >
          <div className="billing-summary-box">
            <div>
              <span>
                CONTAINER
              </span>

              <strong>
                {
                  container.containerNumber
                }
              </strong>
            </div>

            <div>
              <span>
                CONSIGNEE
              </span>

              <strong>
                {container
                  .consignee
                  ?.name ??
                  billing.consigneeName ??
                  '—'}
              </strong>
            </div>

            <div>
              <span>
                TRẠNG THÁI
              </span>

              <strong>
                {
                  container.status
                }
              </strong>
            </div>
          </div>

          <div className="billing-form-actions">
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
              Hủy
            </button>

            <button
              type="submit"
              className="billing-primary-btn"
              disabled={
                submitting
              }
            >
              {submitting
                ? 'Đang tạo...'
                : 'Xác nhận tạo Service Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default ServiceOrderCreatePage;
