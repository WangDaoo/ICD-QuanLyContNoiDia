import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { BarChart3, Download, RefreshCw } from 'lucide-react';
import { apiClient, API_BASE_URL } from '../services/api/client';
import { vietnamDateInput } from '../lib/time';

type ReportTab =
  | 'GATE_ACTIVITY'
  | 'CONTAINER_TURNOVER'
  | 'YARD_CURRENT'
  | 'REVENUE'
  | 'OUTSTANDING_DEBT';

type LoadState = 'idle' | 'loading' | 'ready' | 'error' | 'forbidden';

interface GateActivityData {
  fromDate: string;
  toDate: string;
  totalGateIn: number;
  totalGateOut: number;
  daily: { date: string; gateIn: number; gateOut: number }[];
}

interface ContainerTurnoverData {
  fromDate: string;
  toDate: string;
  totalIn: number;
  totalOut: number;
  avgDwellDays: number | null;
  byShippingLine: { shippingLine: string; count: number }[];
}

interface YardCurrentData {
  totalContainers: number;
  withHold: number;
  locations: { blockCode: string; slotCode: string; containerNumber: string; consignee: string }[];
}

interface RevenueData {
  fromDate: string;
  toDate: string;
  totalRevenue: string | number;
  paidRevenue: string | number;
  buckets: { period: string; revenue: string | number }[];
}

interface OutstandingDebtData {
  totalOutstanding: string | number;
  count: number;
  items: { consignee: string; amount: string | number; invoiceCount: number }[];
}

/** Format VND amounts safely (treats input as already a number from backend) */
function fmtVnd(amount: string | number | undefined | null): string {
  if (amount == null) return '—';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (!Number.isFinite(n)) return '—';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} tỷ ₫`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} triệu ₫`;
  return `${n.toLocaleString('vi-VN')} ₫`;
}

// Report periods are Vietnam business days (UTC+7); toISOString() would roll back a day before 07:00.
function todayStr(): string {
  return vietnamDateInput();
}
function thirtyDaysAgoStr(): string {
  return vietnamDateInput(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

export const ReportsView: React.FC = () => {
  const { currentUser } = useApp();
  const canRead =
    currentUser.permissionCodes?.some((c) => c === '*' || c === 'reports.read') ?? false;

  const [reportTab, setReportTab] = useState<ReportTab>('GATE_ACTIVITY');
  const [fromDate, setFromDate] = useState(thirtyDaysAgoStr);
  const [toDate, setToDate] = useState(todayStr);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [reportData, setReportData] = useState<unknown>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const fetchGenRef = useRef(0);

  const fetchReport = useCallback(
    async (tab: ReportTab, from: string, to: string) => {
      if (!canRead) { setLoadState('forbidden'); return; }
      const gen = ++fetchGenRef.current;
      setLoadState('loading');
      setReportData(null);
      try {
        let data: unknown;
        const params = { fromDate: from, toDate: to, timeZone: 'Asia/Ho_Chi_Minh' };
        if (tab === 'GATE_ACTIVITY') {
          const res = await apiClient.get<{ data: unknown }>('/reports/gate-activity', { params });
          data = res.data;
        } else if (tab === 'CONTAINER_TURNOVER') {
          const res = await apiClient.get<{ data: unknown }>('/reports/container-turnover', { params });
          data = res.data;
        } else if (tab === 'YARD_CURRENT') {
          const res = await apiClient.get<{ data: unknown }>('/reports/yard-inventory/current');
          data = res.data;
        } else if (tab === 'REVENUE') {
          const res = await apiClient.get<{ data: unknown }>('/reports/revenue', { params });
          data = res.data;
        } else if (tab === 'OUTSTANDING_DEBT') {
          const res = await apiClient.get<{ data: unknown }>('/reports/outstanding-debt');
          data = res.data;
        }
        if (gen !== fetchGenRef.current) return;
        setReportData(data);
        setLoadState('ready');
      } catch (err: unknown) {
        if (gen !== fetchGenRef.current) return;
        const status =
          err != null && typeof err === 'object' && 'status' in err
            ? (err as { status?: number }).status
            : undefined;
        setLoadState(status === 403 ? 'forbidden' : 'error');
      }
    },
    [canRead],
  );

  useEffect(() => {
    void fetchReport(reportTab, fromDate, toDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportTab]);

  const handleExportExcel = async () => {
    if (!canRead || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const accessToken = localStorage.getItem('icd_access_token');
      const url = new URL(`${API_BASE_URL}/reports/export.xlsx`);
      url.searchParams.set('fromDate', fromDate);
      url.searchParams.set('toDate', toDate);
      url.searchParams.set('timeZone', 'Asia/Ho_Chi_Minh');
      const response = await fetch(url.toString(), {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `bao-cao-icd-${fromDate}-${toDate}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch {
      setExportError('Không xuất được file Excel. Kiểm tra kết nối rồi bấm "Xuất Excel" lại.');
    } finally {
      setExporting(false);
    }
  };

  const TABS: { id: ReportTab; label: string }[] = [
    { id: 'GATE_ACTIVITY', label: 'Lưu lượng cổng' },
    { id: 'CONTAINER_TURNOVER', label: 'Vòng quay container' },
    { id: 'YARD_CURRENT', label: 'Tồn bãi hiện tại' },
    { id: 'REVENUE', label: 'Doanh thu' },
    { id: 'OUTSTANDING_DEBT', label: 'Công nợ' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Báo cáo vận hành</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Số liệu chính xác theo kỳ từ hệ thống – lưu lượng cổng, tồn bãi, doanh thu, công nợ.
          </p>
        </div>
        {canRead && (
          <button
            onClick={() => void handleExportExcel()}
            disabled={exporting}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-2 shrink-0"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Đang xuất…' : 'Xuất Excel'}
          </button>
        )}
      </div>

      {exportError && (
        <div
          role="alert"
          className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 flex items-start justify-between gap-3"
        >
          <span>{exportError}</span>
          <button type="button" className="font-bold underline shrink-0" onClick={() => setExportError(null)}>
            Đóng
          </button>
        </div>
      )}

      {!canRead && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800">
          Bạn chưa có quyền xem báo cáo. Liên hệ Quản lý để được cấp quyền.
        </div>
      )}

      {canRead && (
        <>
          {/* Date range + Report tabs */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-600">Từ ngày:</label>
              <input
                type="date"
                value={fromDate}
                max={toDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="font-semibold text-slate-600">Đến ngày:</label>
              <input
                type="date"
                value={toDate}
                min={fromDate}
                max={todayStr()}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1.5 border border-slate-300 rounded-lg bg-slate-50"
              />
            </div>
            <button
              onClick={() => void fetchReport(reportTab, fromDate, toDate)}
              disabled={loadState === 'loading'}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadState === 'loading' ? 'animate-spin' : ''}`} />
              Xem báo cáo
            </button>
          </div>

          {/* Report type tabs */}
          <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-slate-200 w-fit max-w-full">
            {TABS.map((t) => (
              <button
                key={t.id}
                aria-pressed={reportTab === t.id}
                onClick={() => setReportTab(t.id)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition ${
                  reportTab === t.id ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Report content */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 text-xs">
            {loadState === 'loading' && (
              <div className="text-center text-slate-400 py-8">Đang tải dữ liệu báo cáo…</div>
            )}
            {loadState === 'forbidden' && (
              <div className="text-center text-amber-700 py-8">Không có quyền xem báo cáo này.</div>
            )}
            {loadState === 'error' && (
              <div className="text-center text-rose-700 py-8">
                Không thể tải báo cáo. Vui lòng thử lại.
              </div>
            )}
            {loadState === 'idle' && (
              <div className="text-center text-slate-400 py-8">
                Chọn khoảng thời gian và nhấn "Xem báo cáo".
              </div>
            )}
            {loadState === 'ready' && reportTab === 'GATE_ACTIVITY' && (
              <GateActivityReport data={reportData as GateActivityData} />
            )}
            {loadState === 'ready' && reportTab === 'CONTAINER_TURNOVER' && (
              <ContainerTurnoverReport data={reportData as ContainerTurnoverData} />
            )}
            {loadState === 'ready' && reportTab === 'YARD_CURRENT' && (
              <YardCurrentReport data={reportData as YardCurrentData} />
            )}
            {loadState === 'ready' && reportTab === 'REVENUE' && (
              <RevenueReport data={reportData as RevenueData} />
            )}
            {loadState === 'ready' && reportTab === 'OUTSTANDING_DEBT' && (
              <OutstandingDebtReport data={reportData as OutstandingDebtData} />
            )}
          </div>
        </>
      )}
    </div>
  );
};

function GateActivityReport({ data }: { data: GateActivityData }) {
  if (!data) return <div className="text-slate-400 text-center py-4">Không có dữ liệu.</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Tổng container vào cổng" value={String(data.totalGateIn ?? 0)} unit="lượt" />
        <KpiCard label="Tổng container ra cổng" value={String(data.totalGateOut ?? 0)} unit="lượt" />
      </div>
      {Array.isArray(data.daily) && data.daily.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2">Ngày</th>
                <th className="px-3 py-2 text-right">Vào cổng</th>
                <th className="px-3 py-2 text-right">Ra cổng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.daily.map((row) => (
                <tr key={row.date} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono">{row.date}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-700">{row.gateIn}</td>
                  <td className="px-3 py-2 text-right font-semibold text-blue-700">{row.gateOut}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ContainerTurnoverReport({ data }: { data: ContainerTurnoverData }) {
  if (!data) return <div className="text-slate-400 text-center py-4">Không có dữ liệu.</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Container nhập bãi" value={String(data.totalIn ?? 0)} unit="container" />
        <KpiCard label="Container xuất bãi" value={String(data.totalOut ?? 0)} unit="container" />
        <KpiCard
          label="Thời gian lưu bãi trung bình"
          value={data.avgDwellDays != null ? data.avgDwellDays.toFixed(1) : '—'}
          unit="ngày"
        />
      </div>
      {Array.isArray(data.byShippingLine) && data.byShippingLine.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2">Hãng tàu</th>
                <th className="px-3 py-2 text-right">Số container</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.byShippingLine.map((row) => (
                <tr key={row.shippingLine} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold text-slate-800">{row.shippingLine}</td>
                  <td className="px-3 py-2 text-right">{row.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function YardCurrentReport({ data }: { data: YardCurrentData }) {
  if (!data) return <div className="text-slate-400 text-center py-4">Không có dữ liệu.</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Container đang trong bãi" value={String(data.totalContainers ?? 0)} unit="container" />
        {data.withHold != null && (
          <KpiCard label="Đang bị giữ" value={String(data.withHold)} unit="container" tone="warning" />
        )}
      </div>
      {Array.isArray(data.locations) && data.locations.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2">Vị trí bãi</th>
                <th className="px-3 py-2">Số container</th>
                <th className="px-3 py-2">Chủ hàng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.locations.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono">{row.blockCode}-{row.slotCode}</td>
                  <td className="px-3 py-2 font-mono font-bold">{row.containerNumber}</td>
                  <td className="px-3 py-2 text-slate-600">{row.consignee}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function RevenueReport({ data }: { data: RevenueData }) {
  if (!data) return <div className="text-slate-400 text-center py-4">Không có dữ liệu.</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Tổng doanh thu xuất HĐ" value={fmtVnd(data.totalRevenue)} />
        <KpiCard label="Doanh thu đã thu" value={fmtVnd(data.paidRevenue)} tone="success" />
      </div>
      {Array.isArray(data.buckets) && data.buckets.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2">Kỳ</th>
                <th className="px-3 py-2 text-right">Doanh thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.buckets.map((row) => (
                <tr key={row.period} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-mono">{row.period}</td>
                  <td className="px-3 py-2 text-right font-semibold text-emerald-700">{fmtVnd(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OutstandingDebtReport({ data }: { data: OutstandingDebtData }) {
  if (!data) return <div className="text-slate-400 text-center py-4">Không có dữ liệu.</div>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="Tổng công nợ" value={fmtVnd(data.totalOutstanding)} tone="warning" />
        <KpiCard label="Số hóa đơn chưa thanh toán" value={String(data.count ?? 0)} unit="HĐ" />
      </div>
      {Array.isArray(data.items) && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase">
              <tr>
                <th className="px-3 py-2">Chủ hàng</th>
                <th className="px-3 py-2 text-right">Công nợ</th>
                <th className="px-3 py-2 text-right">Số HĐ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((row, i) => (
                <tr key={i} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-semibold text-slate-800">{row.consignee}</td>
                  <td className="px-3 py-2 text-right font-semibold text-rose-700">{fmtVnd(row.amount)}</td>
                  <td className="px-3 py-2 text-right">{row.invoiceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: 'success' | 'warning' | 'danger';
}) {
  const valueClass =
    tone === 'success'
      ? 'text-emerald-700'
      : tone === 'warning'
        ? 'text-amber-700'
        : tone === 'danger'
          ? 'text-rose-700'
          : 'text-slate-900';
  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
      <div className="text-slate-500 font-semibold uppercase tracking-wider text-caption">{label}</div>
      <div className={`text-xl font-bold mt-1 ${valueClass}`}>
        {value}
        {unit && <span className="text-slate-500 text-xs font-normal ml-1">{unit}</span>}
      </div>
    </div>
  );
}
