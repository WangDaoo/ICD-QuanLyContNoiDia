import React from 'react';
import { useApp } from '../context/AppContext';
import { getReportMetrics } from '../services/report-metrics';
import { BarChart3, Ship, Layers } from 'lucide-react';
import { ResourceContent } from './CollectionState';

export const ReportsView: React.FC = () => {
  const { containerVisits, invoices, yardSlots, handovers } = useApp();

  const { totalTeu, lineStats, dwellBuckets } = getReportMetrics(containerVisits);

  // Financial
  const totalRevenue = invoices.reduce((acc, i) => acc + i.totalAmountVnd, 0);
  const totalPaid = invoices.reduce((acc, i) => acc + i.paidAmountVnd, 0);

  // Yard occupancy
  const occupiedSlots = yardSlots.filter((s) => s.occupiedByContainerId).length;
  const occupancyRate =
    yardSlots.length > 0 ? ((occupiedSlots / yardSlots.length) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            <span>Báo cáo Quản trị & Phân tích Hoạt động ICD (Analytics & Reports)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tổng hợp hồ sơ container hiện có, công suất bãi, thời gian lưu bãi và số tiền đã thu
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">
            Tổng sản lượng TEU
          </span>
          <ResourceContent resource="containerVisits" count={containerVisits.length}>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalTeu} TEU</div>
          <div className="text-slate-400 mt-1">Tính trên các hồ sơ container hiện có</div>
          </ResourceContent>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">
            Tỷ lệ lấp đầy bãi
          </span>
          <ResourceContent resource="yardSlots" count={yardSlots.length}>
          <div className="text-2xl font-bold text-blue-600 mt-1">{occupancyRate}%</div>
          <div className="text-slate-400 mt-1">
            {occupiedSlots} / {yardSlots.length} vị trí đang sử dụng
          </div>
          </ResourceContent>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">
            Doanh thu thu về
          </span>
          <ResourceContent resource="invoices" count={invoices.length}>
          <div className="text-2xl font-bold text-emerald-700 mt-1">
            {(totalPaid / 1000000).toFixed(1)}M ₫
          </div>
          <div className="text-slate-400 mt-1">
            Tổng xuất HĐ: {(totalRevenue / 1000000).toFixed(1)}M ₫
          </div>
          </ResourceContent>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-slate-500 font-semibold uppercase tracking-wider">
            Chuyến bàn giao ngoại ICD
          </span>
          <ResourceContent resource="handovers" count={handovers.length}>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{handovers.length} chuyến</div>
          <div className="text-slate-400 mt-1">Số hồ sơ bàn giao đã lưu</div>
          </ResourceContent>
        </div>
      </div>

      {/* Breakdown: By Shipping Line */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Ship className="w-4 h-4 text-blue-600" />
            <span>Phân bổ Sản lượng TEU theo Hãng tàu</span>
          </h3>

          <ResourceContent resource="containerVisits" count={containerVisits.length}>
          <div className="space-y-3 text-xs">
            {Object.entries(lineStats).map(([line, teu]) => {
              const percent = totalTeu > 0 ? ((teu / totalTeu) * 100).toFixed(0) : '0';
              return (
                <div key={line} className="space-y-1">
                  <div className="flex justify-between font-semibold text-slate-700">
                    <span>{line}</span>
                    <span>
                      {teu} TEU ({percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${percent}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
          </ResourceContent>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Tình trạng Container Trong Bãi (Yard Dwell Time)</span>
          </h3>

          <ResourceContent resource="containerVisits" count={containerVisits.length}>
          <div className="space-y-3 text-xs">
            {dwellBuckets.map((bucket) => (
              <div
                key={bucket.label}
                className="p-3 bg-slate-50 text-slate-800 rounded-lg flex flex-wrap gap-2 items-center justify-between font-semibold"
              >
                <span>{bucket.label}</span>
                <span>
                  {bucket.count} container · {bucket.percent}%
                </span>
              </div>
            ))}
            <p className="text-slate-500">
              Tính từ ngày vào cổng của container còn trong ICD. Phí thực tế xem tại Dịch vụ & Thanh
              toán.
            </p>
          </div>
          </ResourceContent>
        </div>
      </div>
    </div>
  );
};
