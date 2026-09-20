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
  dashboardApi,
} from '../api/dashboard.api';

import {
  OperationsSummary,
} from '../components/OperationsSummary';

import type {
  DashboardSummary,
  GateHourlyPoint,
} from '../dashboard.types';

import './DashboardPage.css';

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

    if (body?.error?.message) {
      return body.error.message;
    }

    if (
      typeof body?.message ===
      'string'
    ) {
      return body.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Không thể tải dữ liệu Dashboard.';
}

function GateActivityChart({
  points,
}: {
  points: GateHourlyPoint[];
}) {
  const maxValue =
    useMemo(
      () =>
        Math.max(
          1,
          ...points.flatMap(
            (point) => [
              point.gateIn,
              point.gateOut,
            ],
          ),
        ),
      [points],
    );

  return (
    <div className="dashboard-chart">
      <div className="dashboard-chart__legend">
        <span>
          <i className="dashboard-chart__legend-dot dashboard-chart__legend-dot--in" />
          Gate-in
        </span>

        <span>
          <i className="dashboard-chart__legend-dot dashboard-chart__legend-dot--out" />
          Gate-out
        </span>
      </div>

      <div className="dashboard-chart__plot">
        {points.map(
          (point) => {
            const inHeight =
              Math.max(
                2,
                (point.gateIn /
                  maxValue) *
                  100,
              );

            const outHeight =
              Math.max(
                2,
                (point.gateOut /
                  maxValue) *
                  100,
              );

            return (
              <div
                key={point.hour}
                className="dashboard-chart__column"
                title={`${point.hour}:00 · IN ${point.gateIn} · OUT ${point.gateOut}`}
              >
                <div className="dashboard-chart__bars">
                  <div
                    className="dashboard-chart__bar dashboard-chart__bar--in"
                    style={{
                      height:
                        `${inHeight}%`,
                    }}
                  />

                  <div
                    className="dashboard-chart__bar dashboard-chart__bar--out"
                    style={{
                      height:
                        `${outHeight}%`,
                    }}
                  />
                </div>

                {point.hour %
                  3 ===
                  0 && (
                  <span className="dashboard-chart__hour">
                    {String(
                      point.hour,
                    ).padStart(
                      2,
                      '0',
                    )}
                  </span>
                )}
              </div>
            );
          },
        )}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const [
    summary,
    setSummary,
  ] =
    useState<DashboardSummary | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] =
    useState<string | null>(
      null,
    );

  const [
    updatedAt,
    setUpdatedAt,
  ] =
    useState<Date | null>(
      null,
    );

  const loadSummary =
    useCallback(
      async (
        isRefresh = false,
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError(null);

          const data =
            await dashboardApi.getSummary();

          setSummary(data);
          setUpdatedAt(
            new Date(),
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
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  if (
    loading &&
    !summary
  ) {
    return (
      <div className="dashboard-loading">
        <div className="dashboard-loading__spinner" />

        <strong>
          Đang tải Dashboard
        </strong>

        <span>
          Đang tổng hợp dữ liệu vận
          hành ICD...
        </span>
      </div>
    );
  }

  if (
    error &&
    !summary
  ) {
    return (
      <div className="dashboard-error">
        <div className="dashboard-error__icon">
          !
        </div>

        <h2>
          Không thể tải Dashboard
        </h2>

        <p>{error}</p>

        <button
          type="button"
          onClick={() => {
            void loadSummary();
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!summary) {
    return null;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-toolbar">
        <div>
          <h2>
            Tổng quan vận hành
          </h2>

          <p>
            Theo dõi tình trạng bãi,
            cổng, doanh thu và các cảnh
            báo cần xử lý.
          </p>
        </div>

        <div className="dashboard-toolbar__actions">
          {updatedAt && (
            <span className="dashboard-toolbar__updated">
              Cập nhật{' '}
              {updatedAt.toLocaleTimeString(
                'vi-VN',
                {
                  hour: '2-digit',
                  minute:
                    '2-digit',
                },
              )}
            </span>
          )}

          <button
            type="button"
            className="dashboard-refresh"
            disabled={refreshing}
            onClick={() => {
              void loadSummary(
                true,
              );
            }}
          >
            <span
              className={
                refreshing
                  ? 'dashboard-refresh__icon dashboard-refresh__icon--spinning'
                  : 'dashboard-refresh__icon'
              }
            >
              ↻
            </span>

            {refreshing
              ? 'Đang tải'
              : 'Làm mới'}
          </button>
        </div>
      </div>

      {error && (
        <div className="dashboard-inline-error">
          <span>!</span>

          <div>
            <strong>
              Không thể làm mới dữ liệu
            </strong>

            <small>
              {error}
            </small>
          </div>
        </div>
      )}

      <OperationsSummary
        summary={summary}
      />

      <div className="dashboard-main-grid">
        <section className="dashboard-panel dashboard-panel--chart">
          <div className="dashboard-panel__heading">
            <div>
              <span className="dashboard-panel__eyebrow">
                GATE ACTIVITY
              </span>

              <h3>
                Hoạt động cổng hôm nay
              </h3>
            </div>

            <Link
              to="/reports"
              className="dashboard-panel__link"
            >
              Xem báo cáo →
            </Link>
          </div>

          <GateActivityChart
            points={
              summary.gateToday
                .hourly
            }
          />
        </section>

        <aside className="dashboard-panel dashboard-actions">
          <div className="dashboard-panel__heading">
            <div>
              <span className="dashboard-panel__eyebrow">
                OPERATIONS
              </span>

              <h3>
                Truy cập nhanh
              </h3>
            </div>
          </div>

          <div className="dashboard-actions__list">
            <Link
              to="/work-queue"
              className="dashboard-action"
            >
              <span className="dashboard-action__icon">
                ☷
              </span>

              <div>
                <strong>
                  Work Queue
                </strong>

                <small>
                  Công việc cần xử lý
                </small>
              </div>

              <b>→</b>
            </Link>

            <Link
              to="/gate-in"
              className="dashboard-action"
            >
              <span className="dashboard-action__icon">
                ⇥
              </span>

              <div>
                <strong>
                  Gate-in
                </strong>

                <small>
                  Tiếp nhận container
                </small>
              </div>

              <b>→</b>
            </Link>

            <Link
              to="/yard"
              className="dashboard-action"
            >
              <span className="dashboard-action__icon">
                ▦
              </span>

              <div>
                <strong>
                  Yard Operations
                </strong>

                <small>
                  Vị trí và điều phối bãi
                </small>
              </div>

              <b>→</b>
            </Link>

            <Link
              to="/gate-pass"
              className="dashboard-action"
            >
              <span className="dashboard-action__icon">
                ⌁
              </span>

              <div>
                <strong>
                  Gate Pass
                </strong>

                <small>
                  Readiness và Gate-out
                </small>
              </div>

              <b>→</b>
            </Link>
          </div>
        </aside>
      </div>

      <div className="dashboard-bottom-grid">
        <section className="dashboard-status-card">
          <div className="dashboard-status-card__header">
            <span className="dashboard-status-card__icon dashboard-status-card__icon--hold">
              ⛔
            </span>

            <div>
              <strong>
                Operational Holds
              </strong>

              <span>
                Container đang bị giữ
              </span>
            </div>
          </div>

          <strong className="dashboard-status-card__number">
            {
              summary
                .operationalHolds
                .activeCount
            }
          </strong>
        </section>

        <section className="dashboard-status-card">
          <div className="dashboard-status-card__header">
            <span className="dashboard-status-card__icon dashboard-status-card__icon--edi">
              ⇆
            </span>

            <div>
              <strong>
                EDI Alerts
              </strong>

              <span>
                Cảnh báo chưa xử lý
              </span>
            </div>
          </div>

          <strong className="dashboard-status-card__number">
            {
              summary.ediAlerts
                .openCount
            }
          </strong>
        </section>

        <section className="dashboard-status-card">
          <div className="dashboard-status-card__header">
            <span className="dashboard-status-card__icon dashboard-status-card__icon--yard">
              ▦
            </span>

            <div>
              <strong>
                Yard Occupancy
              </strong>

              <span>
                Mức sử dụng hiện tại
              </span>
            </div>
          </div>

          <strong className="dashboard-status-card__number">
            {summary.yard
              .occupancyRate.toFixed(
                1,
              )}
            %
          </strong>
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
