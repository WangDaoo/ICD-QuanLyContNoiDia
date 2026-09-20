import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

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
  ContainerListItem,
} from '../../containers/container.types';

import {
  GateInForm,
} from '../components/GateInForm';

import {
  gateInApi,
} from '../api/gate-in.api';

import type {
  GateInContext,
  GateInRequest,
  GateInResult,
} from '../gate-in.types';

import './GateInPage.css';

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

  return 'Không thể xử lý Gate-in.';
}

export function GateInPage() {
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

  const requestedTruckVisitId =
    searchParams.get(
      'truckVisitId',
    );

  const [
    context,
    setContext,
  ] =
    useState<
      GateInContext | null
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

  const [
    result,
    setResult,
  ] =
    useState<
      GateInResult | null
    >(null);

  const load =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setError(null);

          if (visitId) {
            const loadedContext =
              await gateInApi.getContext(
                visitId,
              );

            if (
              requestedTruckVisitId &&
              loadedContext.availableTruckVisits.some(
                (item) =>
                  item.id ===
                  requestedTruckVisitId,
              )
            ) {
              loadedContext.currentTruckVisit =
                loadedContext.availableTruckVisits.find(
                  (item) =>
                    item.id ===
                    requestedTruckVisitId,
                ) ?? null;
            }

            setContext(
              loadedContext,
            );

            return;
          }

          /*
           * Màn /gate-in không visitId:
           * hiển thị queue container đủ
           * gần với Gate-in để user chọn.
           */
          const containers =
            await containerApi.list();

          setCandidates(
            containers.filter(
              (item) =>
                item.status ===
                  'AUTHORIZED' ||
                item.status ===
                  'PENDING',
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
      [
        visitId,
        requestedTruckVisitId,
      ],
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

  async function handleSubmit(
    input: GateInRequest,
  ) {
    if (!visitId) {
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const submitResult =
        await gateInApi.submit(
          visitId,
          input,
        );

      setResult(
        submitResult,
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
      <div className="gate-in-state">
        <div className="gate-in-spinner" />

        <strong>
          Đang tải Gate-in
        </strong>

        <span>
          Đang kiểm tra Container
          Visit và điều kiện tiếp
          nhận...
        </span>
      </div>
    );
  }

  if (
    error &&
    !context &&
    visitId
  ) {
    return (
      <div className="gate-in-state">
        <div className="gate-in-error-icon">
          !
        </div>

        <strong>
          Không thể mở Gate-in
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
    !visitId
  ) {
    return (
      <div className="gate-in-page">
        <div className="gate-in-toolbar">
          <div>
            <h2>
              Gate-in
            </h2>

            <p>
              Chọn container cần tiếp
              nhận vào ICD.
            </p>
          </div>

          <Link
            to="/truck-visits"
            className="gate-in-secondary-link"
          >
            Truck Visits →
          </Link>
        </div>

        {error && (
          <div className="gate-in-api-error">
            <strong>!</strong>
            {error}
          </div>
        )}

        <section className="gate-in-select-panel">
          <div className="gate-in-select-search">
            <span>⌕</span>

            <input
              type="search"
              placeholder="Tìm container, HBL, MBL, consignee..."
              value={
                search
              }
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

          <div className="gate-in-candidate-list">
            {filteredCandidates.length ===
            0 ? (
              <div className="gate-in-empty">
                <span>⇥</span>

                <strong>
                  Không có container
                  chờ Gate-in
                </strong>
              </div>
            ) : (
              filteredCandidates.map(
                (item) => (
                  <article
                    key={
                      item.visitId
                    }
                    className="gate-in-candidate"
                  >
                    <div className="gate-in-candidate__identity">
                      <strong>
                        {
                          item.containerNumber
                        }
                      </strong>

                      <span>
                        {[
                          item.size,
                          item.type,
                          item.isoCode,
                        ]
                          .filter(
                            Boolean,
                          )
                          .join(
                            ' · ',
                          )}
                      </span>
                    </div>

                    <div className="gate-in-candidate__meta">
                      <span>
                        Consignee
                      </span>

                      <strong>
                        {item.consigneeName ??
                          '—'}
                      </strong>
                    </div>

                    <div className="gate-in-candidate__meta">
                      <span>
                        Status
                      </span>

                      <strong>
                        {
                          item.status
                        }
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/gate-in/${encodeURIComponent(
                            item.visitId,
                          )}`,
                        )
                      }
                    >
                      Gate-in →
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

  if (result) {
    return (
      <div className="gate-in-success">
        <div className="gate-in-success__icon">
          ✓
        </div>

        <span>
          GATE-IN COMPLETED
        </span>

        <h2>
          Gate-in thành công
        </h2>

        <p>
          Container{' '}
          <strong>
            {context
              ?.containerNumber ??
              result.containerNumber ??
              ''}
          </strong>{' '}
          đã được tiếp nhận vào ICD
          và chuyển sang trạng thái{' '}
          <strong>
            {result.status}
          </strong>.
        </p>

        <div className="gate-in-success__meta">
          <div>
            <span>
              Reception ID
            </span>

            <strong>
              {result.receptionId ??
                '—'}
            </strong>
          </div>

          <div>
            <span>
              Gate-in At
            </span>

            <strong>
              {result.gateInAt
                ? new Date(
                    result.gateInAt,
                  ).toLocaleString(
                    'vi-VN',
                  )
                : '—'}
            </strong>
          </div>
        </div>

        <div className="gate-in-success__actions">
          <button
            type="button"
            onClick={() =>
              navigate(
                `/containers/${encodeURIComponent(
                  visitId,
                )}`,
              )
            }
          >
            Xem Container
          </button>

          <button
            type="button"
            className="gate-in-success__primary"
            onClick={() =>
              navigate(
                `/yard/${encodeURIComponent(
                  visitId,
                )}/assign`,
              )
            }
          >
            Xếp vị trí bãi →
          </button>
        </div>
      </div>
    );
  }

  if (!context) {
    return null;
  }

  return (
    <div className="gate-in-page">
      <div className="gate-in-toolbar">
        <div>
          <span className="gate-in-toolbar__eyebrow">
            GATE OPERATIONS
          </span>

          <h2>
            Gate-in{' '}
            {
              context.containerNumber
            }
          </h2>

          <p>
            Kiểm tra thông tin thực tế
            tại cổng trước khi tiếp nhận
            container vào Yard.
          </p>
        </div>

        <button
          type="button"
          className="gate-in-cancel-link"
          disabled={
            submitting
          }
          onClick={() =>
            navigate(
              '/gate-in',
            )
          }
        >
          Hủy
        </button>
      </div>

      {error && (
        <div className="gate-in-api-error">
          <strong>!</strong>

          <span>
            {error}
          </span>
        </div>
      )}

      {context.visitStatus ===
        'IN_YARD' ||
      context.visitStatus ===
        'EXITED' ? (
        <div className="gate-in-blocked">
          <strong>
            Không thể Gate-in
          </strong>

          <p>
            Container đang ở trạng
            thái{' '}
            <b>
              {context.visitStatus}
            </b>
            . Backend sẽ không cho
            phép tiếp nhận lại.
          </p>

          <Link
            to={`/containers/${encodeURIComponent(
              context.visitId,
            )}`}
          >
            Xem Container →
          </Link>
        </div>
      ) : (
        <GateInForm
          context={
            context
          }
          submitting={
            submitting
          }
          onSubmit={
            handleSubmit
          }
        />
      )}
    </div>
  );
}

export default GateInPage;
