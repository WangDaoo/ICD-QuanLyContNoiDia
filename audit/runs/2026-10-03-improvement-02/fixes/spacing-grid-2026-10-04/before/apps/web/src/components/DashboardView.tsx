import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Boxes,
  Truck,
  Receipt,
  QrCode,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  Radio,
} from 'lucide-react';
import { NavTabId } from './Sidebar';
import { CriticalDataNotice } from './CriticalDataNotice';
import { areSafetyReadsReady } from '../services/visit-safety-data';
import { ResourceContent as DashboardResource } from './CollectionState';
import { canAccessWebTab } from '../services/permissions';

interface DashboardViewProps {
  onNavigate: (tab: NavTabId) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigate }) => {
  const {
    containerVisits,
    workQueue,
    yardSlots,
    invoices,
    truckVisits,
    holds,
    visitSafetyStatus = {},
    ediMessages,
    currentUser,
    resourceStatus = {},
    isLoading,
  } = useApp();

  // Metrics
  const inYardContainers = containerVisits.filter((c) => c.state === 'IN_YARD' || c.state === 'UNDER_INSPECTION' || c.state === 'IN_STRIPPING');
  const holdsIncomplete = (resourceStatus.containerVisits && resourceStatus.containerVisits !== 'ready') ||
    (isLoading && !containerVisits.length) || !areSafetyReadsReady(containerVisits.map(v => v.id), visitSafetyStatus, 'holds');
  const exitedContainers = containerVisits.filter((c) => c.state === 'EXITED');
  const gatePassIssuedContainers = containerVisits.filter((c) => c.state === 'GATE_PASS_ISSUED');

  const occupiedSlots = yardSlots.filter((s) => s.occupiedByContainerId).length;
  const totalSlots = yardSlots.length;
  const yardCapacityPercent = totalSlots > 0 ? Math.round((occupiedSlots / totalSlots) * 100) : 0;

  const overdueTasks = workQueue.filter((t) => t.urgency === 'OVERDUE');
  const highTasks = workQueue.filter((t) => t.urgency === 'HIGH');

  // Free days warning: containers in yard with remaining free days <= 2
  const nearFreeDaysEnd = containerVisits.filter((c) => {
    if (!c.gateInAt || c.state === 'EXITED' || c.freeDays === undefined) return false;
    const daysSince = Math.floor((Date.now() - new Date(c.gateInAt).getTime()) / (24 * 3600 * 1000));
    return c.freeDays - daysSince <= 2;
  });

  // Revenue & Debt
  const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmountVnd, 0);
  const totalPaid = invoices.reduce((sum, i) => sum + i.paidAmountVnd, 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  // Handover status

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if any OVERDUE work queue */}
      {overdueTasks.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-rose-900">
                Có {overdueTasks.length} tác vụ QUÁ HẠN SLA trong Danh sách công việc!
              </h2>
              <p className="text-xs text-rose-700">
                {overdueTasks.map((t) => t.title).join(' | ')}
              </p>
            </div>
          </div>
          <button
            hidden={!canAccessWebTab(currentUser, 'work-queue')}
            onClick={() => onNavigate('work-queue')}
            className="px-3.5 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 transition shadow-xs"
          >
            Xử lý ngay →
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Container trong Bãi</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <DashboardResource resource="containerVisits" count={containerVisits.length}>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{inYardContainers.length}</span>
            <span className="text-xs text-slate-500">/ {(resourceStatus.yardSlots ?? (isLoading ? 'loading' : 'ready')) === 'ready' || resourceStatus.yardSlots === 'stale' ? totalSlots : '—'} vị trí</span>
          </div>
          </DashboardResource>
          <DashboardResource resource="yardSlots" count={yardSlots.length}>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Sức chứa bãi:</span>
            <span className="font-semibold text-blue-700">{yardCapacityPercent}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${yardCapacityPercent}%` }}></div>
          </div>
          </DashboardResource>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cần xử lý (Work Queue)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <DashboardResource resource="workQueue" count={workQueue.length}>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{workQueue.length}</span>
            <span className="text-xs text-rose-600 font-semibold">{overdueTasks.length} Quá hạn SLA</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Độ ưu tiên cao:</span>
            <span className="font-semibold text-amber-700">{highTasks.length} tác vụ</span>
          </div>
          <button
            hidden={!canAccessWebTab(currentUser, 'work-queue')}
            onClick={() => onNavigate('work-queue')}
            className="w-full mt-2 text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
          >
            Xem danh sách công việc →
          </button>
          </DashboardResource>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Doanh thu & Công nợ</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <DashboardResource resource="invoices" count={invoices.length}>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl font-bold text-slate-900">{(totalPaid / 1000000).toFixed(1)} tr₫</span>
            <span className="text-xs text-slate-400">đã thu</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Công nợ chưa thu:</span>
            <span className="font-semibold text-rose-600">{(totalOutstanding / 1000000).toFixed(1)} tr₫</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full"
              style={{ width: `${totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0}%` }}
            ></div>
          </div>
          </DashboardResource>
        </div>

        {/* Card 4 - Gate Pass & Sẵn sàng xuất cổng */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Phiếu Ra Cổng & Xuất Bãi</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <DashboardResource resource="containerVisits" count={containerVisits.length}>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900">{gatePassIssuedContainers.length}</span>
            <span className="text-xs text-emerald-700 font-semibold">{exitedContainers.length} đã xuất cổng</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>Sẵn sàng ra cổng:</span>
            <span className="font-semibold text-slate-800">Kiểm tra phiếu & điều kiện</span>
          </div>
          <button
            hidden={!canAccessWebTab(currentUser, 'gate-pass')}
            onClick={() => onNavigate('gate-pass')}
            className="w-full mt-2 text-center text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition"
          >
            Quản lý Phiếu ra cổng & Gate-out →
          </button>
          </DashboardResource>
        </div>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Gate & Yard Activity + Free Days Alert */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section: Chuyến xe & Tiếp nhận hôm nay */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Hoạt động Cổng & Chuyến xe (Truck Visits)</h2>
                <p className="text-xs text-slate-500">Lịch hẹn Gate Appointment và tình trạng tiếp nhận</p>
              </div>
              <button
                hidden={!canAccessWebTab(currentUser, 'truck-visits')}
                onClick={() => onNavigate('truck-visits')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>Xem tất cả</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            <DashboardResource resource="truckVisits" count={truckVisits.length}>
            <div className="space-y-2.5">
              {truckVisits.map((tv) => (
                <div
                  key={tv.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-white hover:border-slate-300 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      tv.status === 'ARRIVED' ? 'bg-amber-100 text-amber-800' :
                      tv.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      <Truck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center space-x-2">
                        <span>{tv.vehiclePlate}</span>
                        <span className="font-normal text-slate-400">·</span>
                        <span className="text-slate-600 font-medium">{tv.driverName}</span>
                      </div>
                      <div className="text-caption text-slate-500">
                        {tv.transporterName} · Cont: <span className="font-mono font-semibold text-slate-700">{tv.containerNumbers.join(', ')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2 py-0.5 text-caption font-bold rounded-full ${
                      tv.status === 'ARRIVED' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      tv.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                    }`}>
                      {tv.status}
                    </span>
                    {tv.gateLane && <div className="text-caption text-slate-400 mt-0.5">{tv.gateLane}</div>}
                  </div>
                </div>
              ))}
            </div>
            </DashboardResource>
          </div>

          {/* Section: Cảnh báo Hết hạn Lưu bãi Miễn phí */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-2">
                  <span>Cảnh báo thời gian lưu bãi</span>
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-caption font-bold rounded-full">
                    {(resourceStatus.freeDayWarnings ?? (isLoading ? 'loading' : 'ready')) === 'ready' ? `${nearFreeDaysEnd.length} container` : 'Chưa kiểm tra'}
                  </span>
                </h2>
                <p className="text-xs text-slate-500">Container gần hoặc vượt ngưỡng cảnh báo từ backend. Phí thực tế xem tại Dịch vụ & Thanh toán.</p>
              </div>
              <button
                hidden={!canAccessWebTab(currentUser, 'billing')}
                onClick={() => onNavigate('billing')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center"
              >
                <span>Tính phí lưu kho</span>
                <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>

            <DashboardResource resource="freeDayWarnings" count={nearFreeDaysEnd.length}>
            <div className="overflow-x-auto" role="region" aria-label="Cảnh báo thời gian lưu bãi" tabIndex={0}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-2 font-medium">Số Container</th>
                    <th className="pb-2 font-medium">Chủ hàng (Consignee)</th>
                    <th className="pb-2 font-medium">Vị trí</th>
                    <th className="pb-2 font-medium">Ngày vào cổng</th>
                    <th className="pb-2 font-medium text-right">Tình trạng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {nearFreeDaysEnd.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-2.5 font-mono font-bold text-slate-900">{c.containerNumber}</td>
                      <td className="py-2.5 text-slate-700">{c.consigneeName}</td>
                      <td className="py-2.5 font-mono text-blue-600 font-semibold">{c.currentLocation || 'Chưa xếp'}</td>
                      <td className="py-2.5 text-slate-500">
                        {c.gateInAt ? new Date(c.gateInAt).toLocaleDateString('vi-VN') : '—'}
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="px-2 py-0.5 text-caption font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          Sắp tính phí lưu bãi
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            </DashboardResource>
          </div>
        </div>

        {/* Right Col: Operational Holds & EDI Monitor */}
        <div className="space-y-6">
          {/* Active Operational Holds Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>Kiểm soát Lệnh Giữ (Operational Holds)</span>
              </h2>
              <span className={`px-2 py-0.5 text-caption font-bold rounded-full ${
                holdsIncomplete || holds.filter(h => h.status === 'ACTIVE').length > 0
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-emerald-100 text-emerald-800'
              }`}>
                {holdsIncomplete ? 'Chưa kiểm tra đủ' : `${holds.filter(h => h.status === 'ACTIVE').length} đang khóa`}
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Các chốt chặn kiểm soát pháp lý, hải quan, cước hãng tàu và hư hỏng trước khi cho phép ra cổng.
            </p>
            <CriticalDataNotice kind="holds" />

            <div className="space-y-2">
              {holds.slice(0, 3).map((hold) => (
                <div
                  key={hold.id}
                  className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-slate-800">
                        {containerVisits.find((v) => v.id === hold.containerVisitId)?.containerNumber || '—'}
                      </span>
                      <span className="px-1.5 py-0.5 text-caption font-bold rounded bg-slate-200 text-slate-700">
                        {hold.holdType}
                      </span>
                    </div>
                    <div className="text-caption text-slate-500 mt-0.5 line-clamp-1">{hold.reason}</div>
                  </div>
                  <span className={`px-2 py-0.5 text-caption font-bold rounded-full shrink-0 ${
                    hold.status === 'ACTIVE'
                      ? 'bg-rose-100 text-rose-700 border border-rose-200'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {hold.status === 'ACTIVE' ? 'Đang giữ' : 'Đã gỡ'}
                  </span>
                </div>
              ))}
            </div>

            <button
              hidden={!canAccessWebTab(currentUser, 'gate-pass')}
              onClick={() => onNavigate('gate-pass')}
              className="w-full mt-3 py-1.5 text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              Kiểm tra điều kiện xuất cổng (Readiness) →
            </button>
          </div>

          {/* EDI Operations Outbox Snapshot */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>Vận hành EDI (CODECO)</span>
              </h2>
              <span className="text-caption text-slate-400">Shipping Lines</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Thông điệp gửi tự động cho hãng tàu khi Gate-in và Gate-out thành công.
            </p>

            <DashboardResource resource="ediMessages" count={ediMessages.length}>
            <div className="space-y-2">
              {ediMessages.map((edi) => (
                <div
                  key={edi.id}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800 font-mono">{edi.containerNumber}</div>
                    <div className="text-caption text-slate-500">
                      {edi.messageType} · Hãng: {edi.shippingLine}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-0.5 text-caption font-bold rounded-full ${edi.status === 'SENT' ? 'bg-emerald-100 text-emerald-800' : edi.status === 'FAILED' || edi.status === 'DEAD' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-800'}`}>
                      Gửi: {edi.status}
                    </span>
                    {edi.ackStatus && <div className="text-caption text-slate-600 mt-1">ACK: {edi.ackStatus}</div>}
                    <div className="text-caption font-mono text-slate-400 mt-0.5">{edi.ackReference}</div>
                  </div>
                </div>
              ))}
            </div>
            </DashboardResource>

            <button
              hidden={!canAccessWebTab(currentUser, 'edi')}
              onClick={() => onNavigate('edi')}
              className="w-full mt-3 py-1.5 text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
            >
              Xem toàn bộ Outbox EDI →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
