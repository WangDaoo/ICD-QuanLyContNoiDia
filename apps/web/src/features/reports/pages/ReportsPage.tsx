import { useState, useEffect, useCallback } from 'react';
import { reportApi } from '../api/report.api';
import type {
  ContainerTurnoverReport,
  GateActivityReport,
  OutstandingDebtReport,
  ReportDashboardSummary,
  ReportRangeFilter,
  ReportTab,
  RevenueReport,
  YardCurrentReport,
  YardEodReport,
  YardInventoryMode,
} from '../report.types';
import { ReportKpiGrid } from '../components/ReportKpiGrid';
import { GateActivityTable } from '../components/GateActivityTable';
import { ContainerTurnoverTable } from '../components/ContainerTurnoverTable';
import { YardInventoryTable } from '../components/YardInventoryTable';
import { RevenueTable } from '../components/RevenueTable';
import { OutstandingDebtTable } from '../components/OutstandingDebtTable';
import './Reports.css';

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getSevenDaysAgoString(): string {
  const date = new Date();
  date.setDate(date.getDate() - 7);
  return date.toISOString().slice(0, 10);
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [fromDate, setFromDate] = useState<string>(getSevenDaysAgoString());
  const [toDate, setToDate] = useState<string>(getTodayString());
  const [groupBy, setGroupBy] = useState<'DAY' | 'MONTH' | 'QUARTER'>('DAY');
  const [yardMode, setYardMode] = useState<YardInventoryMode>('current');
  const [eodDate, setEodDate] = useState<string>(getTodayString());

  // Data states
  const [summary, setSummary] = useState<ReportDashboardSummary | null>(null);
  const [gateActivity, setGateActivity] = useState<GateActivityReport | null>(null);
  const [turnover, setTurnover] = useState<ContainerTurnoverReport | null>(null);
  const [yardCurrent, setYardCurrent] = useState<YardCurrentReport | null>(null);
  const [yardEod, setYardEod] = useState<YardEodReport | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [debt, setDebt] = useState<OutstandingDebtReport | null>(null);

  // Status states
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const range: ReportRangeFilter = { fromDate, toDate, groupBy };

    try {
      if (activeTab === 'overview') {
        const [sumData, revData, debtData] = await Promise.all([
          reportApi.getDashboardSummary(),
          reportApi.getRevenue(range),
          reportApi.getOutstandingDebt(),
        ]);
        setSummary(sumData);
        setRevenue(revData);
        setDebt(debtData);
      } else if (activeTab === 'gate-activity') {
        const data = await reportApi.getGateActivity(range);
        setGateActivity(data);
      } else if (activeTab === 'container-turnover') {
        const data = await reportApi.getContainerTurnover(range);
        setTurnover(data);
      } else if (activeTab === 'yard-inventory') {
        if (yardMode === 'current') {
          const data = await reportApi.getYardCurrent();
          setYardCurrent(data);
        } else {
          const data = await reportApi.getYardEod(eodDate);
          setYardEod(data);
        }
      } else if (activeTab === 'revenue') {
        const data = await reportApi.getRevenue(range);
        setRevenue(data);
      } else if (activeTab === 'debt') {
        const data = await reportApi.getOutstandingDebt();
        setDebt(data);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : 'Không thể tải báo cáo từ hệ thống.',
      );
    } finally {
      setLoading(false);
    }
  }, [activeTab, fromDate, toDate, groupBy, yardMode, eodDate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportFullExcel = async () => {
    try {
      setExporting(true);
      await reportApi.exportFullExcel({ fromDate, toDate }, eodDate);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xuất Excel tổng hợp thất bại.');
    } finally {
      setExporting(false);
    }
  };

  const handleExportYardEodExcel = async () => {
    try {
      setExporting(true);
      await reportApi.exportYardEodExcel(eodDate);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Xuất Excel tồn bãi EOD thất bại.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="reports-page">
      <div className="reports-header">
        <div>
          <span className="reports-header__subtitle">Analytics & Business Intelligence</span>
          <h1>Trung tâm Báo cáo & Thống kê</h1>
          <p>Báo cáo vận hành cổng, luân chuyển bãi, doanh thu thực thu và công nợ ICD.</p>
        </div>
        <div className="reports-actions">
          <button
            type="button"
            className="reports-btn reports-btn--secondary"
            onClick={loadData}
            disabled={loading}
          >
            🔄 Làm mới
          </button>
          <button
            type="button"
            className="reports-btn reports-btn--primary"
            onClick={handleExportFullExcel}
            disabled={exporting}
          >
            {exporting ? 'Đang xuất Excel...' : '📊 Xuất Excel Tổng Hợp (7 Sheets)'}
          </button>
        </div>
      </div>

      <div className="reports-filter-bar">
        <div className="reports-filter-item">
          <label htmlFor="rep-from-date">Từ ngày:</label>
          <input
            id="rep-from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="reports-input"
          />
        </div>
        <div className="reports-filter-item">
          <label htmlFor="rep-to-date">Đến ngày:</label>
          <input
            id="rep-to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="reports-input"
          />
        </div>
        {activeTab === 'revenue' && (
          <div className="reports-filter-item">
            <label htmlFor="rep-group-by">Nhóm theo:</label>
            <select
              id="rep-group-by"
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as 'DAY' | 'MONTH' | 'QUARTER')}
              className="reports-input"
            >
              <option value="DAY">Theo ngày (Day)</option>
              <option value="MONTH">Theo tháng (Month)</option>
              <option value="QUARTER">Theo quý (Quarter)</option>
            </select>
          </div>
        )}
      </div>

      <nav className="reports-nav-tabs">
        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'overview' ? 'reports-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Tổng quan KPI
        </button>
        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'gate-activity' ? 'reports-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('gate-activity')}
        >
          Hoạt động Cổng
        </button>
        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'container-turnover' ? 'reports-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('container-turnover')}
        >
          Luân chuyển & Lưu bãi
        </button>
        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'yard-inventory' ? 'reports-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('yard-inventory')}
        >
          Tồn Bãi (Current & EOD)
        </button>
        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'revenue' ? 'reports-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('revenue')}
        >
          Doanh thu (Phân bổ)
        </button>
        <button
          type="button"
          className={`reports-tab-btn ${activeTab === 'debt' ? 'reports-tab-btn--active' : ''}`}
          onClick={() => setActiveTab('debt')}
        >
          Công nợ & Quá hạn
        </button>
      </nav>

      {loading && (
        <div className="reports-state-container">
          <div className="reports-spinner" />
          <p>Đang truy vấn số liệu báo cáo...</p>
        </div>
      )}

      {error && (
        <div className="reports-state-container" style={{ color: '#dc2626' }}>
          <p>⚠️ {error}</p>
          <button type="button" className="reports-btn reports-btn--secondary" onClick={loadData}>
            Thử lại
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          {activeTab === 'overview' && summary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ReportKpiGrid summary={summary} />

              <div className="reports-grid-2col">
                {revenue && <RevenueTable report={revenue} />}
                {debt && <OutstandingDebtTable report={debt} />}
              </div>
            </div>
          )}

          {activeTab === 'gate-activity' && gateActivity && (
            <GateActivityTable report={gateActivity} />
          )}

          {activeTab === 'container-turnover' && turnover && (
            <ContainerTurnoverTable report={turnover} />
          )}

          {activeTab === 'yard-inventory' && (
            <YardInventoryTable
              mode={yardMode}
              onModeChange={setYardMode}
              currentReport={yardCurrent}
              eodReport={yardEod}
              eodDate={eodDate}
              onEodDateChange={setEodDate}
              onExportEodExcel={handleExportYardEodExcel}
              exporting={exporting}
            />
          )}

          {activeTab === 'revenue' && revenue && (
            <RevenueTable report={revenue} />
          )}

          {activeTab === 'debt' && debt && (
            <OutstandingDebtTable report={debt} />
          )}
        </>
      )}
    </div>
  );
}

export default ReportsPage;
