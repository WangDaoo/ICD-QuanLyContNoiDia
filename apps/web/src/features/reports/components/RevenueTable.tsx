import type { RevenueReport } from '../report.types';

type RevenueTableProps = {
  report: RevenueReport;
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function RevenueTable({ report }: RevenueTableProps) {
  return (
    <div className="reports-section-container">
      <div className="reports-section-header">
        <div>
          <h3>Doanh thu theo phân bổ thanh toán thực tế (Payment Allocation)</h3>
          <p>
            Doanh thu tính trên tiền thực thu khớp vào hóa đơn, không tính trên tổng hóa đơn phát hành. Kỳ: {report.period.fromDate} đến {report.period.toDate}
          </p>
        </div>
        <div className="reports-badge-group">
          <span className="reports-badge reports-badge--success">
            Tổng thực thu: {formatCurrency(report.summary.totalRevenue)}
          </span>
          <span className="reports-badge reports-badge--info">
            {report.summary.allocationCount} lần phân bổ
          </span>
        </div>
      </div>

      <div className="reports-grid-2col">
        <div className="reports-card">
          <h4>Doanh thu theo chu kỳ ({report.period.groupBy})</h4>
          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>CHU KỲ</th>
                  <th>DOANH THU THỰC THU</th>
                </tr>
              </thead>
              <tbody>
                {report.series.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', color: '#94a3b8' }}>
                      Chưa có doanh thu phát sinh trong kỳ
                    </td>
                  </tr>
                ) : (
                  report.series.map((item) => (
                    <tr key={item.bucket}>
                      <td><strong>{item.bucket}</strong></td>
                      <td style={{ color: '#0284c7', fontWeight: 600 }}>
                        {formatCurrency(item.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="reports-card">
          <h4>Doanh thu theo loại dịch vụ</h4>
          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>DỊCH VỤ</th>
                  <th>DOANH THU</th>
                </tr>
              </thead>
              <tbody>
                {report.byServiceType.length === 0 ? (
                  <tr>
                    <td colSpan={2} style={{ textAlign: 'center', color: '#94a3b8' }}>
                      Không có dữ liệu
                    </td>
                  </tr>
                ) : (
                  report.byServiceType.map((svc) => (
                    <tr key={svc.serviceTypeId}>
                      <td><strong>{svc.serviceTypeName}</strong></td>
                      <td style={{ fontWeight: 600 }}>{formatCurrency(svc.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="reports-card" style={{ marginTop: '16px' }}>
        <h4>Top khách hàng / Chủ hàng đóng góp doanh thu</h4>
        <div className="reports-table-wrapper">
          <table className="reports-table">
            <thead>
              <tr>
                <th>KHÁCH HÀNG / DOANH NGHIỆP</th>
                <th>TỔNG DOANH THU THỰC THU</th>
              </tr>
            </thead>
            <tbody>
              {report.byConsignee.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ textAlign: 'center', color: '#94a3b8' }}>
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                report.byConsignee.map((c) => (
                  <tr key={c.consigneeId}>
                    <td><strong>{c.consigneeName}</strong></td>
                    <td style={{ color: '#16a34a', fontWeight: 600 }}>
                      {formatCurrency(c.amount)}
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
