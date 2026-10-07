import { useViewQueryState } from '../context/useViewQueryState';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReadOnlyNotice } from './ReadOnlyNotice';
import { Route, CheckCircle2, XCircle, Clock, Search } from 'lucide-react';
import { NavTabId } from './Sidebar';

import { vietnamDateTimeInput, vietnamDateTimeToIso } from '../lib/time';
import { useCommandAction, CommandNotice } from './useCommandAction';
import { hasWebPermission } from '../services/permissions';
import { CollectionState } from './CollectionState';

interface MovementOrdersViewProps {
  onNavigate?: (tab: NavTabId, contextId?: string) => void;
  targetVisitId?: string;
}

export const MovementOrdersView: React.FC<MovementOrdersViewProps> = ({
  onNavigate,
  targetVisitId,
}) => {
  const {
    currentUser,
    movementOrders,
    containerVisits,
    createMovementOrder,
    authorizeMovementOrder,
    cancelMovementOrder,
  } = useApp();
  const can = (permission: string) => hasWebPermission(currentUser, permission);
  const action = useCommandAction();
  const [searchTerm, setSearchTerm] = useViewQueryState('movement-orders', 'search', '');
  const [expiresAt, setExpiresAt] = useState(vietnamDateTimeInput(Date.now() + 86400000));

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'bg-amber-100 text-amber-800',
      AUTHORIZED: 'bg-emerald-100 text-emerald-800',
      EXPIRED: 'bg-slate-200 text-slate-600',
      CANCELLED: 'bg-rose-100 text-rose-800',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded-full text-caption font-bold ${map[status] || 'bg-slate-100 text-slate-600'}`}
      >
        {status}
      </span>
    );
  };

  const eligibleVisits = containerVisits.filter(
    (v) =>
      v.state === 'PENDING' &&
      !movementOrders.some((o) => o.containerVisitId === v.id && o.status !== 'CANCELLED'),
  );

  const filtered = movementOrders.filter(
    (o) =>
      (!targetVisitId || o.containerVisitId === targetVisitId) &&
      (o.orderCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.containerNumber.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Route className="w-5 h-5 text-blue-600" />
            <span>Movement Order — Lệnh cho phép container di chuyển về ICD</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Mắt xích bắt buộc giữa Container Visit (PENDING) và Truck Visit/Gate-in. Chỉ khi
            Authorize thành công, container mới đủ điều kiện vào cổng.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Tìm mã lệnh, số container..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <CommandNotice notice={action.notice} />
      <ReadOnlyNotice writePermissions={['movement_order.create', 'movement_order.authorize', 'movement_order.cancel']} />
      <label hidden={!can('movement_order.authorize')} className="block text-sm text-slate-700">
        Thời hạn khi duyệt lệnh (giờ Việt Nam UTC+7)
        <input
          aria-label="Thời hạn khi duyệt lệnh (giờ Việt Nam UTC+7)"
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="ml-3 rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      {eligibleVisits.length > 0 && can('movement_order.create') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-xs font-bold text-amber-900 mb-2">
            {eligibleVisits.length} Container Visit đang PENDING chưa có Movement Order:
          </h4>
          <div className="flex flex-wrap gap-2">
            {eligibleVisits.map((v) => (
              <button
                key={v.id}
                disabled={action.pending}
                onClick={async () => {
                  await action.run(() => createMovementOrder(v.id));
                }}
                className="px-3 py-1.5 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold text-amber-900"
              >
                + Tạo lệnh cho {v.containerNumber}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase text-caption">
            <tr>
              <th className="text-left px-4 py-3">Mã lệnh</th>
              <th className="text-left px-4 py-3">Container</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-left px-4 py-3">Tạo lúc</th>
              <th className="text-left px-4 py-3">Hết hạn</th>
              <th className="text-left px-4 py-3">Duyệt bởi</th>
              <th className="text-right px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-slate-800">{o.orderCode}</td>
                <td className="px-4 py-3 font-mono">{o.containerNumber}</td>
                <td className="px-4 py-3">{statusBadge(o.status)}</td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(o.createdAt).toLocaleString('vi-VN')}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {o.expiresAt ? new Date(o.expiresAt).toLocaleString('vi-VN') : '—'}
                </td>
                <td className="px-4 py-3 text-slate-500">{o.authorizedBy || '—'}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  {o.status === 'DRAFT' && (
                    <>
                      <button
                        hidden={!can('movement_order.authorize')}
                        disabled={action.pending}
                        onClick={async () => {
                          if (!can('movement_order.authorize')) return;
                          const instant = vietnamDateTimeToIso(expiresAt);
                          if (!instant || new Date(instant).getTime() <= Date.now()) {
                            alert('Chọn thời hạn trong tương lai.');
                            return;
                          }
                          await action.run(() => authorizeMovementOrder(o.id, instant));
                        }}
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3 h-3" /> Authorize
                      </button>
                      <button
                        hidden={!can('movement_order.cancel')}
                        onClick={async () => {
                          if (!can('movement_order.cancel')) return;
                          const reason = window.prompt('Lý do hủy:');
                          if (reason && window.confirm(`Hủy lệnh ${o.orderCode}?`))
                            await action.run(() => cancelMovementOrder(o.id, reason));
                        }}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold border border-rose-200 inline-flex items-center gap-1"
                      >
                        <XCircle className="w-3 h-3" /> Hủy
                      </button>
                    </>
                  )}
                  {o.status === 'AUTHORIZED' && can('truck_visit.create') && onNavigate && (
                    <button
                      onClick={() => onNavigate('truck-visits', o.containerVisitId)}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-bold border border-blue-200 inline-flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" /> Tạo Truck Visit
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  <CollectionState
                    resource="movementOrders"
                    count={filtered.length}
                    total={movementOrders.length}
                    filtered={Boolean(searchTerm || targetVisitId)}
                    onClear={() => {
                      setSearchTerm('');
                      if (targetVisitId) onNavigate?.('movement-orders');
                    }}
                  />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
