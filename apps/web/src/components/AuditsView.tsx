import { useViewQueryState } from '../context/useViewQueryState';
import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Search, User } from 'lucide-react';

import { CollectionState, ConfirmedResourceValue } from './CollectionState';

/** Maps backend action codes to Vietnamese business names */
const ACTION_LABEL: Record<string, string> = {
  // Container visits
  CREATE_CONTAINER_VISIT: 'Tạo hồ sơ container',
  UPDATE_CONTAINER_VISIT: 'Cập nhật hồ sơ container',
  CANCEL_CONTAINER_VISIT: 'Hủy hồ sơ container',
  // Gate operations
  SUBMIT_GATE_IN: 'Xác nhận tiếp nhận vào cổng',
  CONFIRM_GATE_IN: 'Duyệt tiếp nhận cổng vào',
  SUBMIT_GATE_OUT: 'Xác nhận container ra cổng',
  CONFIRM_GATE_OUT: 'Duyệt ra cổng',
  GATE_IN: 'Tiếp nhận vào cổng',
  GATE_OUT: 'Container ra cổng',
  // Gate pass
  ISSUE_GATE_PASS: 'Phát hành phiếu ra cổng',
  REVOKE_GATE_PASS: 'Thu hồi phiếu ra cổng',
  SCAN_GATE_PASS: 'Quét phiếu ra cổng',
  // Manifests / Bills of lading
  CREATE_MANIFEST: 'Tạo lược khai hàng hóa',
  UPDATE_MANIFEST: 'Cập nhật lược khai',
  SUBMIT_MANIFEST: 'Nộp lược khai',
  APPROVE_MANIFEST: 'Duyệt lược khai',
  CREATE_MASTER_BL: 'Tạo vận đơn chủ',
  UPDATE_MASTER_BL: 'Cập nhật vận đơn chủ',
  CREATE_HOUSE_BL: 'Tạo vận đơn con',
  UPDATE_HOUSE_BL: 'Cập nhật vận đơn con',
  // Billing
  CREATE_SERVICE_ORDER: 'Tạo đơn dịch vụ',
  UPDATE_SERVICE_ORDER: 'Cập nhật đơn dịch vụ',
  CONFIRM_SERVICE_ORDER: 'Xác nhận đơn dịch vụ',
  CANCEL_SERVICE_ORDER: 'Hủy đơn dịch vụ',
  CREATE_INVOICE: 'Tạo hóa đơn',
  CANCEL_INVOICE: 'Hủy hóa đơn',
  RECORD_PAYMENT: 'Ghi nhận thanh toán',
  VOID_PAYMENT: 'Hủy giao dịch thanh toán',
  // Holds
  PLACE_HOLD: 'Đặt lệnh giữ container',
  RELEASE_HOLD: 'Giải phóng lệnh giữ',
  // Yard operations
  ASSIGN_YARD_SLOT: 'Giao vị trí bãi',
  MOVE_CONTAINER: 'Di chuyển container trong bãi',
  CREATE_YARD_TASK: 'Tạo lệnh bãi',
  COMPLETE_YARD_TASK: 'Hoàn tất lệnh bãi',
  CANCEL_YARD_TASK: 'Hủy lệnh bãi',
  // Handovers
  CREATE_HANDOVER: 'Tạo lệnh bàn giao',
  UPDATE_HANDOVER: 'Cập nhật lệnh bàn giao',
  CONFIRM_HANDOVER: 'Xác nhận bàn giao',
  COMPLETE_HANDOVER: 'Hoàn tất bàn giao',
  // Truck visits
  CREATE_TRUCK_VISIT: 'Tạo chuyến xe',
  UPDATE_TRUCK_VISIT: 'Cập nhật chuyến xe',
  // EDI
  DISPATCH_EDI: 'Gửi điện tín EDI',
  RETRY_EDI: 'Gửi lại điện tín EDI',
  RESOLVE_EDI_ALERT: 'Xử lý cảnh báo EDI',
  // Users / Roles
  CREATE_USER: 'Tạo người dùng',
  UPDATE_USER: 'Cập nhật người dùng',
  DEACTIVATE_USER: 'Vô hiệu hóa người dùng',
  ACTIVATE_USER: 'Kích hoạt người dùng',
  UPDATE_ROLE_PERMISSIONS: 'Cập nhật phân quyền vai trò',
  // Master data
  CREATE_SHIPPING_LINE: 'Tạo hãng tàu',
  TOGGLE_SHIPPING_LINE: 'Thay đổi trạng thái hãng tàu',
  CREATE_CONSIGNEE: 'Tạo chủ hàng',
  TOGGLE_CONSIGNEE: 'Thay đổi trạng thái chủ hàng',
  CREATE_TRANSPORTER: 'Tạo đơn vị vận tải',
  CREATE_CLEARING_AGENT: 'Tạo đại lý hải quan',
};

/** Maps backend entity types to Vietnamese */
const ENTITY_TYPE_LABEL: Record<string, string> = {
  ContainerVisit: 'Hồ sơ container',
  Manifest: 'Lược khai hàng hóa',
  MasterBl: 'Vận đơn chủ',
  HouseBl: 'Vận đơn con',
  GatePass: 'Phiếu ra cổng',
  TruckVisit: 'Chuyến xe',
  ServiceOrder: 'Đơn dịch vụ',
  Invoice: 'Hóa đơn',
  Payment: 'Giao dịch thanh toán',
  OperationalHold: 'Lệnh giữ',
  YardTask: 'Lệnh bãi',
  Handover: 'Lệnh bàn giao',
  EdiOutboxMessage: 'Điện tín EDI',
  EdiAlert: 'Cảnh báo EDI',
  User: 'Người dùng',
  Role: 'Vai trò',
  ShippingLine: 'Hãng tàu',
  Consignee: 'Chủ hàng',
  Transporter: 'Đơn vị vận tải',
  ClearingAgent: 'Đại lý hải quan',
};

function getActionLabel(action: string): { label: string; isMapped: boolean } {
  if (ACTION_LABEL[action]) return { label: ACTION_LABEL[action], isMapped: true };
  // Fallback: convert snake_case to Title Case
  return { label: action, isMapped: false };
}

function getEntityTypeLabel(entityType: string): string {
  return ENTITY_TYPE_LABEL[entityType] ?? entityType;
}

export const AuditsView: React.FC = () => {
  const { auditLogs } = useApp();
  const [searchTerm, setSearchTerm] = useViewQueryState('activity', 'search', '');
  const [filterActor, setFilterActor] = useViewQueryState('activity', 'actor', '');
  const [filterEntityType, setFilterEntityType] = useViewQueryState('activity', 'entityType', '');
  const [filterFromDate, setFilterFromDate] = useViewQueryState('activity', 'from', '');
  const [filterToDate, setFilterToDate] = useViewQueryState('activity', 'to', '');

  // Unique actor list from logs
  const actors = useMemo(
    () => Array.from(new Set(auditLogs.map((l) => l.actor))).sort(),
    [auditLogs],
  );

  // Unique entity types with Vietnamese labels
  const entityTypes = useMemo(
    () => Array.from(new Set(auditLogs.map((l) => l.entityType))).sort(),
    [auditLogs],
  );

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (filterActor && log.actor !== filterActor) return false;
      if (filterEntityType && log.entityType !== filterEntityType) return false;
      if (filterFromDate) {
        const logDate = new Date(log.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        if (logDate < filterFromDate) return false;
      }
      if (filterToDate) {
        const logDate = new Date(log.timestamp).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
        if (logDate > filterToDate) return false;
      }
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const actionLabel = getActionLabel(log.action).label.toLowerCase();
        const entityLabel = getEntityTypeLabel(log.entityType).toLowerCase();
        if (
          !actionLabel.includes(q) &&
          !log.action.toLowerCase().includes(q) &&
          !entityLabel.includes(q) &&
          !log.entityType.toLowerCase().includes(q) &&
          !log.entityId.toLowerCase().includes(q) &&
          !log.actor.toLowerCase().includes(q) &&
          !log.details.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [auditLogs, filterActor, filterEntityType, filterFromDate, filterToDate, searchTerm]);

  const hasFilter = !!(filterActor || filterEntityType || filterFromDate || filterToDate || searchTerm);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterActor('');
    setFilterEntityType('');
    setFilterFromDate('');
    setFilterToDate('');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Nhật ký thao tác</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận vết can thiệp nghiệp vụ (Ai đã làm gì, lúc nào, đối tượng và thông tin chi
            tiết)
          </p>
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-lg font-semibold">
          <ConfirmedResourceValue resource="auditLogs">Tổng cộng: {auditLogs.length} bản ghi</ConfirmedResourceValue>
        </span>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quick text search */}
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              aria-label="Tìm nhật ký kiểm toán"
              placeholder="Tìm theo hành động, đối tượng, người thực hiện..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          {/* Actor filter */}
          <select
            aria-label="Lọc theo người thực hiện"
            value={filterActor}
            onChange={(e) => setFilterActor(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700"
          >
            <option value="">Tất cả người thực hiện</option>
            {actors.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>

          {/* Entity type filter */}
          <select
            aria-label="Lọc theo loại đối tượng"
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700"
          >
            <option value="">Tất cả loại đối tượng</option>
            {entityTypes.map((et) => (
              <option key={et} value={et}>{getEntityTypeLabel(et)}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Date range */}
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-600">Từ ngày:</label>
            <input
              type="date"
              aria-label="Từ ngày"
              value={filterFromDate}
              max={filterToDate || undefined}
              onChange={(e) => setFilterFromDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-semibold text-slate-600">Đến ngày:</label>
            <input
              type="date"
              aria-label="Đến ngày"
              value={filterToDate}
              min={filterFromDate || undefined}
              onChange={(e) => setFilterToDate(e.target.value)}
              className="px-2 py-1.5 border border-slate-200 rounded-lg bg-slate-50"
            />
          </div>
          {hasFilter && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 font-semibold"
            >
              Xóa bộ lọc
            </button>
          )}
          <span className="text-slate-500">
            Hiển thị {filteredLogs.length} / {auditLogs.length} bản ghi
          </span>
        </div>
      </div>

      <div role="region" aria-label="Nhật ký thao tác, cuộn ngang để xem các cột" tabIndex={0} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="py-3 px-4">Thời gian</th>
              <th className="py-3 px-4">Người thực hiện</th>
              <th className="py-3 px-4">Hành động</th>
              <th className="py-3 px-4">Đối tượng</th>
              <th className="py-3 px-4">Chi tiết nghiệp vụ</th>
              <th className="py-3 px-4 font-mono">Request ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td colSpan={6}>
                <CollectionState
                  resource="auditLogs"
                  count={filteredLogs.length}
                  total={auditLogs.length}
                  filtered={hasFilter}
                  onClear={clearFilters}
                />
              </td>
            </tr>
            {filteredLogs.map((log) => {
              const { label: actionLabel, isMapped } = getActionLabel(log.action);
              const entityTypeLabel = getEntityTypeLabel(log.entityType);
              return (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-500 font-mono text-caption">
                    {new Date(log.timestamp).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-800">
                    <div className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{log.actor}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={isMapped ? 'font-semibold text-slate-800' : 'font-mono font-bold text-blue-700'}
                      title={isMapped ? `Mã: ${log.action}` : undefined}
                    >
                      {actionLabel}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-700">{entityTypeLabel}</span>
                    {entityTypeLabel !== log.entityType && (
                      <span className="sr-only">{log.entityType}</span>
                    )}
                    <br />
                    <span className="font-mono text-slate-400 text-caption">{log.entityId.slice(0, 8)}…</span>
                  </td>
                  <td className="py-3 px-4 text-slate-700 max-w-sm">{log.details}</td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-caption">{log.requestId}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
