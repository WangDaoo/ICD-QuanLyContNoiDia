import { useState } from 'react';
import type { YardCurrentReport, YardEodReport, YardInventoryMode } from '../report.types';

type YardInventoryTableProps = {
  mode: YardInventoryMode;
  onModeChange: (mode: YardInventoryMode) => void;
  currentReport: YardCurrentReport | null;
  eodReport: YardEodReport | null;
  eodDate: string;
  onEodDateChange: (date: string) => void;
  onExportEodExcel: () => void;
  exporting: boolean;
};

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('vi-VN');
}

export function YardInventoryTable({
  mode,
  onModeChange,
  currentReport,
  eodReport,
  eodDate,
  onEodDateChange,
  onExportEodExcel,
  exporting,
}: YardInventoryTableProps) {
  const [filterBlock, setFilterBlock] = useState<string>('ALL');

  return (
    <div className="reports-section-container">
      <div className="reports-inventory-controls">
        <div className="reports-mode-toggle">
          <button
            type="button"
            className={`reports-mode-btn ${mode === 'current' ? 'reports-mode-btn--active' : ''}`}
            onClick={() => onModeChange('current')}
          >
            Hiện tại (Realtime)
          </button>
          <button
            type="button"
            className={`reports-mode-btn ${mode === 'eod' ? 'reports-mode-btn--active' : ''}`}
            onClick={() => onModeChange('eod')}
          >
            Lịch sử chốt ngày (Historical EOD)
          </button>
        </div>

        {mode === 'eod' && (
          <div className="reports-eod-picker-group">
            <label htmlFor="eod-date-input">Chốt cuối ngày:</label>
            <input
              id="eod-date-input"
              type="date"
              value={eodDate}
              onChange={(e) => onEodDateChange(e.target.value)}
              className="reports-input"
            />
            <button
              type="button"
              className="reports-btn reports-btn--secondary"
              onClick={onExportEodExcel}
              disabled={exporting}
            >
              {exporting ? 'Đang xuất...' : '📥 Xuất Excel EOD'}
            </button>
          </div>
        )}
      </div>

      {mode === 'current' && currentReport && (
        <>
          <div className="reports-section-header">
            <div>
              <h3>Tồn bãi thời gian thực</h3>
              <p>Dựa trên log vị trí slot đang ACTIVE (endedAt IS NULL)</p>
            </div>
            <div className="reports-badge-group">
              <span className="reports-badge reports-badge--info">Đang chứa: {currentReport.summary.occupiedSlots} slots</span>
              <span className="reports-badge reports-badge--neutral">Tổng slots vận hành: {currentReport.summary.operationalSlots}</span>
              <span className="reports-badge reports-badge--success">Còn trống: {currentReport.summary.availableSlots}</span>
              <span className="reports-badge reports-badge--warning">Tỷ lệ lấp đầy: {(currentReport.summary.occupancyRate * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="reports-block-filter">
            <button
              type="button"
              className={`reports-chip ${filterBlock === 'ALL' ? 'reports-chip--active' : ''}`}
              onClick={() => setFilterBlock('ALL')}
            >
              Tất cả blocks ({currentReport.data.length})
            </button>
            {currentReport.byBlock.map((b) => (
              <button
                key={b.blockCode}
                type="button"
                className={`reports-chip ${filterBlock === b.blockCode ? 'reports-chip--active' : ''}`}
                onClick={() => setFilterBlock(b.blockCode)}
              >
                Block {b.blockCode}: {b.count} cont
              </button>
            ))}
          </div>

          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>SỐ CONTAINER</th>
                  <th>LOẠI CONT</th>
                  <th>BLOCK</th>
                  <th>VỊ TRÍ (SLOT)</th>
                  <th>TRẠNG THÁI</th>
                  <th>CHỦ HÀNG</th>
                  <th>VÀO VỊ TRÍ LÚC</th>
                </tr>
              </thead>
              <tbody>
                {currentReport.data
                  .filter((item) => filterBlock === 'ALL' || item.blockCode === filterBlock)
                  .map((item) => (
                    <tr key={item.locationId}>
                      <td><strong>{item.containerNumber}</strong></td>
                      <td><span className="reports-tag">{item.containerType}</span></td>
                      <td><strong>{item.blockCode}</strong></td>
                      <td><code>{item.slotCode} (R{item.rowNo}-B{item.bayNo}-T{item.tierNo})</code></td>
                      <td>
                        <span className="reports-status-pill">{item.state}</span>
                      </td>
                      <td>{item.consignee?.name ?? '—'}</td>
                      <td>{formatDateTime(item.startedAt)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {mode === 'eod' && eodReport && (
        <>
          <div className="reports-section-header">
            <div>
              <h3>Tồn bãi chốt ngày {eodReport.date}</h3>
              <p>Tái dựng từ khoảng thời gian của container_location_log tại mốc 23:59:59 ({eodReport.timeZone})</p>
            </div>
            <div className="reports-badge-group">
              <span className="reports-badge reports-badge--info">Tổng tồn EOD: {eodReport.total} containers</span>
              <span className="reports-badge reports-badge--neutral">
                {eodReport.isFinalized ? '✓ Đã chốt sổ' : '⏳ Chưa kết thúc ngày'}
              </span>
            </div>
          </div>

          <div className="reports-block-filter">
            <button
              type="button"
              className={`reports-chip ${filterBlock === 'ALL' ? 'reports-chip--active' : ''}`}
              onClick={() => setFilterBlock('ALL')}
            >
              Tất cả blocks ({eodReport.data.length})
            </button>
            {eodReport.byBlock.map((b) => (
              <button
                key={b.blockCode}
                type="button"
                className={`reports-chip ${filterBlock === b.blockCode ? 'reports-chip--active' : ''}`}
                onClick={() => setFilterBlock(b.blockCode)}
              >
                Block {b.blockCode}: {b.count}
              </button>
            ))}
          </div>

          <div className="reports-table-wrapper">
            <table className="reports-table">
              <thead>
                <tr>
                  <th>SỐ CONTAINER</th>
                  <th>LOẠI CONT</th>
                  <th>BLOCK</th>
                  <th>VỊ TRÍ (SLOT)</th>
                  <th>BẮT ĐẦU Ở VỊ TRÍ</th>
                  <th>RỜI VỊ TRÍ</th>
                </tr>
              </thead>
              <tbody>
                {eodReport.data
                  .filter((item) => filterBlock === 'ALL' || item.blockCode === filterBlock)
                  .map((item, idx) => (
                    <tr key={`${item.containerNumber}-${idx}`}>
                      <td><strong>{item.containerNumber}</strong></td>
                      <td><span className="reports-tag">{item.containerType}</span></td>
                      <td><strong>{item.blockCode}</strong></td>
                      <td><code>{item.slotCode}</code></td>
                      <td>{formatDateTime(item.locationStartedAt)}</td>
                      <td>
                        {item.locationEndedAt ? (
                          formatDateTime(item.locationEndedAt)
                        ) : (
                          <span style={{ color: '#16a34a' }}>Đang ở bãi</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
