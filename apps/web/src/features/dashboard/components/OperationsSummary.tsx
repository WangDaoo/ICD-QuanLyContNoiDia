import type {
  DashboardSummary,
} from '../dashboard.types';

type OperationsSummaryProps = {
  summary: DashboardSummary;
};

function formatNumber(
  value: number,
): string {
  return new Intl.NumberFormat(
    'vi-VN',
  ).format(value);
}

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

function clampPercent(
  value: number,
): number {
  return Math.min(
    100,
    Math.max(0, value),
  );
}

export function OperationsSummary({
  summary,
}: OperationsSummaryProps) {
  const occupancy =
    clampPercent(
      summary.yard.occupancyRate,
    );

  return (
    <section className="dashboard-kpi-grid">
      <article className="dashboard-kpi-card">
        <div className="dashboard-kpi-card__header">
          <span className="dashboard-kpi-card__label">
            CONTAINER TRONG BÃI
          </span>

          <span className="dashboard-kpi-card__icon">
            ▦
          </span>
        </div>

        <div className="dashboard-kpi-card__value">
          {formatNumber(
            summary.yard
              .currentInventory,
          )}
        </div>

        <div className="dashboard-kpi-card__meta">
          {summary.yard.capacity >
          0
            ? `${occupancy.toFixed(
                1,
              )}% công suất`
            : 'Theo vị trí hiện tại'}
        </div>

        <div className="dashboard-progress">
          <div
            className="dashboard-progress__value"
            style={{
              width: `${occupancy}%`,
            }}
          />
        </div>
      </article>

      <article className="dashboard-kpi-card">
        <div className="dashboard-kpi-card__header">
          <span className="dashboard-kpi-card__label">
            HOẠT ĐỘNG CỔNG HÔM NAY
          </span>

          <span className="dashboard-kpi-card__icon">
            ⇄
          </span>
        </div>

        <div className="dashboard-kpi-card__split">
          <div>
            <strong>
              {formatNumber(
                summary.gateToday
                  .gateIn,
              )}
            </strong>

            <span>
              Gate-in
            </span>
          </div>

          <div>
            <strong>
              {formatNumber(
                summary.gateToday
                  .gateOut,
              )}
            </strong>

            <span>
              Gate-out
            </span>
          </div>
        </div>

        <div className="dashboard-kpi-card__meta">
          Net flow:{' '}
          <strong>
            {summary.gateToday
              .netFlow >= 0
              ? '+'
              : ''}
            {
              summary.gateToday
                .netFlow
            }
          </strong>
        </div>
      </article>

      <article className="dashboard-kpi-card">
        <div className="dashboard-kpi-card__header">
          <span className="dashboard-kpi-card__label">
            DOANH THU THÁNG
          </span>

          <span className="dashboard-kpi-card__icon">
            ₫
          </span>
        </div>

        <div className="dashboard-kpi-card__value dashboard-kpi-card__value--money">
          {formatCurrency(
            summary.revenueMonth
              .amount,
          )}
        </div>

        <div className="dashboard-kpi-card__meta">
          {summary.revenueMonth
            .invoiceCount > 0
            ? `${formatNumber(
                summary.revenueMonth
                  .invoiceCount,
              )} hóa đơn`
            : 'Theo payment allocation'}
        </div>
      </article>

      <article className="dashboard-kpi-card dashboard-kpi-card--warning">
        <div className="dashboard-kpi-card__header">
          <span className="dashboard-kpi-card__label">
            CÔNG NỢ
          </span>

          <span className="dashboard-kpi-card__icon">
            !
          </span>
        </div>

        <div className="dashboard-kpi-card__value dashboard-kpi-card__value--money">
          {formatCurrency(
            summary.outstandingDebt
              .amount,
          )}
        </div>

        <div className="dashboard-kpi-card__meta">
          {summary.outstandingDebt
            .invoiceCount > 0
            ? `${formatNumber(
                summary
                  .outstandingDebt
                  .invoiceCount,
              )} hóa đơn còn nợ`
            : 'Không có hóa đơn tồn'}
        </div>
      </article>

      <article className="dashboard-kpi-card dashboard-kpi-card--compact">
        <div className="dashboard-kpi-card__header">
          <span className="dashboard-kpi-card__label">
            OPERATIONAL HOLD
          </span>

          <span className="dashboard-kpi-card__icon">
            ⛔
          </span>
        </div>

        <div className="dashboard-kpi-card__compact-row">
          <strong>
            {
              summary
                .operationalHolds
                .activeCount
            }
          </strong>

          <span>
            hold đang hoạt động
          </span>
        </div>
      </article>

      <article className="dashboard-kpi-card dashboard-kpi-card--compact">
        <div className="dashboard-kpi-card__header">
          <span className="dashboard-kpi-card__label">
            EDI ALERT
          </span>

          <span className="dashboard-kpi-card__icon">
            ⇆
          </span>
        </div>

        <div className="dashboard-kpi-card__compact-row">
          <strong>
            {
              summary.ediAlerts
                .openCount
            }
          </strong>

          <span>
            cảnh báo chưa xử lý
          </span>
        </div>
      </article>
    </section>
  );
}
