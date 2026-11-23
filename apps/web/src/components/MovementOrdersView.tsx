import { useViewQueryState } from '../context/useViewQueryState';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ReadOnlyNotice } from './ReadOnlyNotice';
import { Route, CheckCircle2, XCircle, Clock, Search } from 'lucide-react';
import { NavTabId } from './Sidebar';

import { vietnamDateTimeInput, vietnamDateTimeToIso, formatVietnamDateTime } from '../lib/time';
import { useCommandAction, CommandNotice } from './useCommandAction';
import { hasWebPermission } from '../services/permissions';
import { CollectionState } from './CollectionState';
import { ConfirmDialog } from './ConfirmDialog';
import { businessLabel } from '../lib/business-labels';

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

  // Authorize dialog state (per-row expiry)
  const [authorizeTarget, setAuthorizeTarget] = useState<{
    id: string;
    orderCode: string;
    containerNumber: string;
  } | null>(null);
  const [authorizeExpiresAt, setAuthorizeExpiresAt] = useState(() =>
    vietnamDateTimeInput(Date.now() + 86400000),
  );
  const [authorizeError, setAuthorizeError] = useState('');

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState<{
    id: string;
    orderCode: string;
    containerNumber: string;
  } | null>(null);

  const statusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      DRAFT: 'bg-amber-100 text-amber-800',
      AUTHORIZED: 'bg-emerald-100 text-emerald-800',
      EXPIRED: 'bg-slate-200 text-slate-600',
      CANCELLED: 'bg-rose-100 text-rose-800',
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-caption font-bold ${colorMap[status] || 'bg-slate-100 text-slate-600'}`}
      >
        {businessLabel('movementOrderStatus', status)}
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

  /** Days remaining until expiry; 0 = expires today; negative = already expired; null = no expiry set */
  const daysRemaining = (expiresAt: string | undefined): number | null => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.ceil(diff / 86400000);
  };

  return (
    <div className="space-y-5">
      {/* Authorize dialog with per-row expiry input */}
      {authorizeTarget && (
        <ConfirmDialog
          title="Duyệt lệnh cho phép vào cổng"
          message="Lệnh sẽ có hiệu lực ngay sau khi duyệt. Container đủ điều kiện làm thủ tục vào cổng đến hết thời hạn."
          summary={[
            { label: 'Mã lệnh', value: authorizeTarget.orderCode },
            { label: 'Số container', value: authorizeTarget.containerNumber },
          ]}
          confirmLabel="Duyệt lệnh"
          tone="primary"
          pending={action.pending}
          notice={action.notice}
          onClose={() => {
            if (!action.pending) {
              setAuthorizeTarget(null);
              setAuthorizeError('');
            }
          }}
          onConfirm={async () => {
            const instant = vietnamDateTimeToIso(authorizeExpiresAt);
            if (!instant || new Date(instant).getTime() <= Date.now()) {
              setAuthorizeError('Vui lòng chọn thời hạn trong tương lai.');
              return;
            }
            setAuthorizeError('');
            const result = await action.run(() =>
              authorizeMovementOrder(authorizeTarget.id, instant),
            );
            if (result?.success) setAuthorizeTarget(null);
          }}
        >
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700">
              Thời hạn hết hạn lệnh (Giờ Việt Nam UTC+7)*
            </label>
            <input
              type="datetime-local"
              value={authorizeExpiresAt}
              onChange={(e) => {
                setAuthorizeExpiresAt(e.target.value);
                setAuthorizeError('');
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              required
            />
            {authorizeError && (
              <p role="alert" className="text-xs text-rose-700 font-semibold mt-1">
                {authorizeError}
              </p>
            )}
          </div>
        </ConfirmDialog>
      )}

      {/* Cancel dialog with reason */}
      {cancelTarget && (
        <ConfirmDialog
          title="Hủy lệnh cho phép vào cổng"
          message="Thao tác này sẽ hủy lệnh vận chuyển. Container sẽ trở về trạng thái chờ cấp lệnh mới."
          summary={[
            { label: 'Mã lệnh', value: cancelTarget.orderCode },
            { label: 'Số container', value: cancelTarget.containerNumber },
          ]}
          reason={{
            label: 'Lý do hủy',
            placeholder: 'Nhập lý do hủy lệnh...',
            minLength: 5,
          }}
          confirmLabel="Xác nhận hủy"
          tone="danger"
          pending={action.pending}
          notice={action.notice}
          onClose={() => {
            if (!action.pending) setCancelTarget(null);
          }}
          onConfirm={async (reason) => {
            const result = await action.run(() => cancelMovementOrder(cancelTarget.id, reason));
            if (result?.success) setCancelTarget(null);
          }}
        />
      )}

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Route className="w-5 h-5 text-blue-600" />
            <span>Lệnh cho phép vào cổng (Movement Order)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Liên kết bắt buộc giữa Container và Chuyến xe vào cổng. Chỉ khi lệnh được duyệt,
            container mới đủ điều kiện làm thủ tục vào cổng.
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
      <ReadOnlyNotice
        writePermissions={[
          'movement_order.create',
          'movement_order.authorize',
          'movement_order.cancel',
        ]}
      />

      {eligibleVisits.length > 0 && can('movement_order.create') && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h4 className="text-xs font-bold text-amber-900 mb-2">
            {eligibleVisits.length} container đang chờ cấp lệnh chưa có lệnh cho phép vào cổng:
          </h4>
          <div className="flex flex-wrap gap-2">
            {eligibleVisits.map((v) => (
              <button
                key={v.id}
                disabled={action.pending}
                onClick={async () => {
                  await action.run(() => createMovementOrder(v.id));
                }}
                className="px-3 py-2 bg-white hover:bg-amber-100 border border-amber-300 rounded-lg text-xs font-bold text-amber-900 text-left"
              >
                <div className="font-mono">{v.containerNumber}</div>
                <div className="font-normal text-amber-700 mt-0.5">
                  {v.containerType} · {v.consigneeName}
                </div>
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
              <th className="text-left px-4 py-3">Khách hàng</th>
              <th className="text-left px-4 py-3">Trạng thái</th>
              <th className="text-left px-4 py-3">Tạo lúc</th>
              <th className="text-left px-4 py-3">Hết hạn</th>
              <th className="text-left px-4 py-3">Duyệt bởi</th>
              <th className="text-right px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((o) => {
              const visit = containerVisits.find((v) => v.id === o.containerVisitId);
              const days = daysRemaining(o.expiresAt);
              return (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono font-bold text-slate-800">{o.orderCode}</td>
                  <td className="px-4 py-3 font-mono">
                    <div>{o.containerNumber}</div>
                    {visit && (
                      <div className="text-slate-500 text-caption">{visit.containerType}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{visit?.consigneeName || '—'}</td>
                  <td className="px-4 py-3">{statusBadge(o.status)}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatVietnamDateTime(o.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {o.expiresAt ? (
                      <div>
                        <div>{formatVietnamDateTime(o.expiresAt)}</div>
                        {o.status === 'AUTHORIZED' && days !== null && (
                          <div
                            className={`font-bold mt-0.5 ${days <= 1 ? 'text-rose-700' : 'text-slate-500'}`}
                          >
                            {days <= 0 ? 'Hết hạn hôm nay' : `Còn ${days} ngày`}
                          </div>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{o.authorizedBy || '—'}</td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {o.status === 'DRAFT' && (
                      <>
                        <button
                          hidden={!can('movement_order.authorize')}
                          disabled={action.pending}
                          onClick={() => {
                            if (!can('movement_order.authorize')) return;
                            setAuthorizeExpiresAt(vietnamDateTimeInput(Date.now() + 86400000));
                            setAuthorizeTarget({
                              id: o.id,
                              orderCode: o.orderCode,
                              containerNumber: o.containerNumber,
                            });
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-bold inline-flex items-center gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Duyệt lệnh
                        </button>
                        <button
                          hidden={!can('movement_order.cancel')}
                          disabled={action.pending}
                          onClick={() => {
                            if (!can('movement_order.cancel')) return;
                            setCancelTarget({
                              id: o.id,
                              orderCode: o.orderCode,
                              containerNumber: o.containerNumber,
                            });
                          }}
                          className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-md font-bold border border-rose-200 inline-flex items-center gap-1"
                        >
                          <XCircle className="w-3 h-3" /> Hủy
                        </button>
                      </>
                    )}
                    {o.status === 'AUTHORIZED' && can('truck_visit.create') && onNavigate && (
                      <button
                        onClick={() => onNavigate('truck-visits', o.containerVisitId)}
                        className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-md font-bold border border-blue-200 inline-flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" /> Tạo Chuyến xe →
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-slate-400">
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
