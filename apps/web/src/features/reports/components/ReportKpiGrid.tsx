import type { ReportDashboardSummary } from '../report.types';

type ReportKpiGridProps = {
  summary: ReportDashboardSummary;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function ReportKpiGrid({ summary }: ReportKpiGridProps) {
  return (
    <div className="reports-kpi-grid">
      <div className="reports-kpi-card">
        <div className="reports-kpi-card__label">TỔNG CONT TRONG BÃI</div>
        <div className="reports-kpi-card__value">{summary.yard.inYardCount}</div>
        <div className="reports-kpi-card__meta">
          <span>GP Issued / Holds: {summary.yard.byCategory['IMPORT'] ?? 0} nhập, {summary.yard.byCategory['EXPORT'] ?? 0} xuất</span>
        </div>
      </div>

      <div className="reports-kpi-card">
        <div className="reports-kpi-card__label">GATE HÔM NAY (IN / OUT)</div>
        <div className="reports-kpi-card__value">
          <span style={{ color: '#16a34a' }}>+{summary.gateToday.gateIn}</span>
          {' / '}
          <span style={{ color: '#dc2626' }}>-{summary.gateToday.gateOut}</span>
        </div>
        <div className="reports-kpi-card__meta">
          <span>Net Flow: <strong>{summary.gateToday.netFlow > 0 ? `+${summary.gateToday.netFlow}` : summary.gateToday.netFlow}</strong></span>
        </div>
      </div>

      <div className="reports-kpi-card">
        <div className="reports-kpi-card__label">DOANH THU THÁNG (ALLOCATED)</div>
        <div className="reports-kpi-card__value" style={{ color: '#0284c7' }}>
          {formatCurrency(summary.revenueMonth.totalRevenue)}
        </div>
        <div className="reports-kpi-card__meta">
          <span>{summary.revenueMonth.allocationCount} giao dịch thanh toán</span>
        </div>
      </div>

      <div className="reports-kpi-card">
        <div className="reports-kpi-card__label">CÔNG NỢ CHƯA THU</div>
        <div className="reports-kpi-card__value" style={{ color: summary.outstandingDebt.totalOverdue > 0 ? '#ea580c' : '#475569' }}>
          {formatCurrency(summary.outstandingDebt.totalOutstanding)}
        </div>
        <div className="reports-kpi-card__meta">
          <span>Quá hạn: <strong style={{ color: '#dc2626' }}>{formatCurrency(summary.outstandingDebt.totalOverdue)}</strong> ({summary.outstandingDebt.invoiceCount} HĐ)</span>
        </div>
      </div>

      <div className="reports-kpi-card">
        <div className="reports-kpi-card__label">CẢNH BÁO LƯU BÃI (FREE-DAY)</div>
        <div className="reports-kpi-card__value" style={{ color: summary.freeDayWarnings.totalWarnings > 0 ? '#d97706' : '#64748b' }}>
          {summary.freeDayWarnings.totalWarnings} cont
        </div>
        <div className="reports-kpi-card__meta">
          <span>Hạn miễn phí: {summary.freeDayWarnings.freeDaysLimit} ngày</span>
        </div>
      </div>

      <div className="reports-kpi-card">
        <div className="reports-kpi-card__label">HOLDS & EDI ALERTS</div>
        <div className="reports-kpi-card__value">
          <span style={{ color: summary.operationalHolds.activeCount > 0 ? '#ef4444' : '#64748b' }}>
            {summary.operationalHolds.activeCount} Hold
          </span>
          {' · '}
          <span style={{ color: summary.ediAlerts.activeAlertsCount > 0 ? '#f59e0b' : '#64748b' }}>
            {summary.ediAlerts.activeAlertsCount} Alert
          </span>
        </div>
        <div className="reports-kpi-card__meta">
          <span>EDI: {summary.ediAlerts.openCount} open, {summary.ediAlerts.acknowledgedCount} ack</span>
        </div>
      </div>
    </div>
  );
}
