import type { ContainerTurnoverReport } from '../report.types';

type ContainerTurnoverTableProps = {
  report: ContainerTurnoverReport;
};

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

export function ContainerTurnoverTable({ report }: ContainerTurnoverTableProps) {
  return (
    <div className="reports-section-container">
      <div className="reports-section-header">
        <div>
          <h3>Thời gian lưu bãi & Luân chuyển Container (Turnover / Dwell)</h3>
          <p>
            Các container đã Gate-out trong khoảng: {report.period.fromDate} đến {report.period.toDate}
          </p>
        </div>
        <div className="reports-badge-group">
          <span className="reports-badge reports-badge--info">Đã xuất bãi: {report.summary.exitedCount} cont</span>
          <span className="reports-badge reports-badge--warning">Trung bình lưu: {report.summary.averageDwellHours}h (~{(report.summary.averageDwellHours / 24).toFixed(1)} ngày)</span>
          <span className="reports-badge reports-badge--neutral">Min: {report.summary.minimumDwellHours}h | Max: {report.summary.maximumDwellHours}h</span>
        </div>
      </div>

      <div className="reports-table-wrapper">
        <table className="reports-table">
          <thead>
            <tr>
              <th>SỐ CONTAINER</th>
              <th>LOẠI CONT</th>
              <th>CHỦ HÀNG (CONSIGNEE)</th>
              <th>GATE IN</th>
              <th>GATE OUT</th>
              <th>LƯU (GIỜ)</th>
              <th>LƯU (NGÀY)</th>
            </tr>
          </thead>
          <tbody>
            {report.data.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', color: '#94a3b8' }}>
                  Không có container nào xuất bãi trong khoảng thời gian này
                </td>
              </tr>
            ) : (
              report.data.map((item) => (
                <tr key={item.containerVisitId}>
                  <td><strong>{item.containerNumber}</strong></td>
                  <td><span className="reports-tag">{item.containerType}</span></td>
                  <td>{item.consignee?.name ?? '—'}</td>
                  <td>{formatDateTime(item.gateInAt)}</td>
                  <td>{formatDateTime(item.gateOutAt)}</td>
                  <td><code>{item.dwellHours}h</code></td>
                  <td>
                    <strong style={{ color: item.dwellDays > 5 ? '#dc2626' : '#1e293b' }}>
                      {item.dwellDays} ngày
                    </strong>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
