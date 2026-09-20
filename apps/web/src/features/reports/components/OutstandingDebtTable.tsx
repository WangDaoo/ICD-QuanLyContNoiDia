import type { OutstandingDebtReport } from '../report.types';

type OutstandingDebtTableProps = {
  report: OutstandingDebtReport;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('vi-VN');
}

export function OutstandingDebtTable({ report }: OutstandingDebtTableProps) {
  return (
    <div className="reports-section-container">
      <div className="reports-section-header">
        <div>
          <h3>Công nợ chưa thu & Quá hạn (Outstanding Debt / Overdue)</h3>
          <p>
            Các hóa đơn ở trạng thái UNPAID hoặc PARTIALLY_PAID tính đến thời điểm hiện tại.
          </p>
        </div>
        <div className="reports-badge-group">
          <span className="reports-badge reports-badge--info">Hóa đơn còn nợ: {report.summary.invoiceCount}</span>
          <span className="reports-badge reports-badge--warning">
            Tổng nợ chưa thu: {formatCurrency(report.summary.totalOutstanding)}
          </span>
          <span className="reports-badge reports-badge--danger">
            Nợ quá hạn: {formatCurrency(report.summary.totalOverdue)}
          </span>
        </div>
      </div>

      <div className="reports-card" style={{ marginBottom: '16px' }}>
        <h4>Công nợ theo khách hàng / Doanh nghiệp</h4>
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>KHÁCH HÀNG</th>
                <th>MÃ SỐ THUẾ</th>
                <th>SỐ HÓA ĐƠN NỢ</th>
                <th>TỔNG NỢ</th>
                <th>TRONG ĐÓ QUÁ HẠN</th>
              </tr>
            </thead>
            <tbody>
              {report.byConsignee.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', color: '#94a3b8' }}>
                    Không có công nợ tồn đọng
                  </td>
                </tr>
              ) : (
                report.byConsignee.map((c) => (
                  <tr key={c.consigneeId}>
                    <td><strong>{c.consigneeName}</strong></td>
                    <td><code>{c.taxCode ?? '—'}</code></td>
                    <td>{c.invoiceCount}</td>
                    <td style={{ fontWeight: 600 }}>{formatCurrency(c.totalOutstanding)}</td>
                    <td>
                      {c.overdueAmount > 0 ? (
                        <strong style={{ color: '#dc2626' }}>{formatCurrency(c.overdueAmount)}</strong>
                      ) : (
                        <span style={{ color: '#16a34a' }}>0 ₫</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="reports-card">
        <h4>Chi tiết từng hóa đơn chưa thanh toán</h4>
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>SỐ HÓA ĐƠN</th>
                <th>CHỦ HÀNG</th>
                <th>NGÀY PHÁT HÀNH</th>
                <th>HẠN THANH TOÁN</th>
                <th>TỔNG TIỀN</th>
                <th>ĐÃ TRẢ</th>
                <th>CÒN NỢ</th>
                <th>TRẠNG THÁI</th>
              </tr>
            </thead>
            <tbody>
              {report.data.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: '#94a3b8' }}>
                    Không có hóa đơn nợ
                  </td>
                </tr>
              ) : (
                report.data.map((inv) => (
                  <tr key={inv.invoiceId}>
                    <td><strong>{inv.invoiceNo}</strong></td>
                    <td>{inv.consignee.name}</td>
                    <td>{formatDateTime(inv.issuedAt)}</td>
                    <td>{formatDateTime(inv.dueAt)}</td>
                    <td>{formatCurrency(inv.totalAmount)}</td>
                    <td style={{ color: '#16a34a' }}>{formatCurrency(inv.paidAmount)}</td>
                    <td><strong style={{ color: '#ea580c' }}>{formatCurrency(inv.outstandingAmount)}</strong></td>
                    <td>
                      {inv.isOverdue ? (
                        <span className="reports-badge reports-badge--danger">
                          Quá hạn ({inv.daysOverdue} ngày)
                        </span>
                      ) : (
                        <span className="reports-badge reports-badge--neutral">Trong hạn</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
