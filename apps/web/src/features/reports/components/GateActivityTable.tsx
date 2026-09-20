import type { GateActivityReport } from '../report.types';

type GateActivityTableProps = {
  report: GateActivityReport;
};

export function GateActivityTable({ report }: GateActivityTableProps) {
  return (
    <div className="reports-section-container">
      <div className="reports-section-header">
        <div>
          <h3>Hoạt động Cổng (Gate In / Gate Out)</h3>
          <p>
            Khoảng thời gian: {report.period.fromDate} đến {report.period.toDate} ({report.period.timeZone})
          </p>
        </div>
        <div className="reports-badge-group">
          <span className="reports-badge reports-badge--success">Tổng Vào: +{report.summary.gateIn}</span>
          <span className="reports-badge reports-badge--danger">Tổng Ra: -{report.summary.gateOut}</span>
          <span className="reports-badge reports-badge--info">
            Net Flow: {report.summary.netFlow > 0 ? `+${report.summary.netFlow}` : report.summary.netFlow}
          </span>
        </div>
      </div>

      <div className="reports-grid-2col">
        <div className="reports-card">
          <h4>Diễn biến theo ngày</h4>
          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>NGÀY</th>
                  <th>GATE IN</th>
                  <th>GATE OUT</th>
                  <th>NET FLOW</th>
                </tr>
              </thead>
              <tbody>
                {report.daily.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8' }}>
                      Không có hoạt động cổng trong khoảng thời gian này
                    </td>
                  </tr>
                ) : (
                  report.daily.map((item) => {
                    const net = item.gateIn - item.gateOut;
                    return (
                      <tr key={item.date}>
                        <td><strong>{item.date}</strong></td>
                        <td style={{ color: '#16a34a' }}>+{item.gateIn}</td>
                        <td style={{ color: '#dc2626' }}>-{item.gateOut}</td>
                        <td style={{ fontWeight: 600 }}>{net > 0 ? `+${net}` : net}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="reports-card">
          <h4>Phân bổ theo khung giờ trong ngày (0h - 23h)</h4>
          <div className="reports-hourly-chart">
            {report.hourly.map((h) => {
              const maxVal = Math.max(
                ...report.hourly.map((x) => Math.max(x.gateIn, x.gateOut)),
                1,
              );
              const inHeight = (h.gateIn / maxVal) * 100;
              const outHeight = (h.gateOut / maxVal) * 100;

              return (
                <div key={h.hour} className="reports-hourly-bar-col" title={`Giờ ${h.hour}: In ${h.gateIn}, Out ${h.gateOut}`}>
                  <div className="reports-hourly-bar-wrapper">
                    <div className="reports-hourly-bar reports-hourly-bar--in" style={{ height: `${inHeight}%` }} />
                    <div className="reports-hourly-bar reports-hourly-bar--out" style={{ height: `${outHeight}%` }} />
                  </div>
                  <span className="reports-hourly-label">{h.hour}h</span>
                </div>
              );
            })}
          </div>
          <div className="reports-chart-legend">
            <span className="reports-legend-item"><span className="reports-legend-color reports-legend-color--in" /> Gate In</span>
            <span className="reports-legend-item"><span className="reports-legend-color reports-legend-color--out" /> Gate Out</span>
          </div>
        </div>
      </div>
    </div>
  );
}
