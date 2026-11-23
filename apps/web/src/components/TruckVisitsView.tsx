import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

import { Truck, Plus, Search, LogIn, LogOut } from 'lucide-react';
import { NavTabId } from './Sidebar';

import { useCommandAction, CommandNotice } from './useCommandAction';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState, ConfirmedResourceValue } from './CollectionState';
import { ConfirmDialog } from './ConfirmDialog';
import { SearchableSelect } from './SearchableSelect';
import type { PickerOption } from './SearchableSelect';
import { businessLabel } from '../lib/business-labels';
import { vietnamDateTimeInput, vietnamDateTimeToIso } from '../lib/time';

interface TruckVisitsViewProps {
  targetVisitId?: string;
  /** Truck visit to scroll to and highlight (e.g. opened from the dashboard). */
  highlightTruckVisitId?: string;
  onNavigate: (tab: NavTabId, contextId?: string) => void;
}

type StatusFilter = 'ALL' | 'SCHEDULED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED';

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'SCHEDULED', label: 'Đã lên lịch' },
  { value: 'ARRIVED', label: 'Xe đã đến' },
  { value: 'IN_PROGRESS', label: 'Đang xử lý' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
];

export const TruckVisitsView: React.FC<TruckVisitsViewProps> = ({ onNavigate, targetVisitId, highlightTruckVisitId }) => {
  const {
    currentUser,
    truckVisits,
    createTruckVisit,
    updateTruckVisitStatus,
    arriveTruckVisit,
    cancelTruckVisit,
    containerVisits,
    transporters,
  } = useApp();

  const can = (permission: string) =>
    currentUser.permissionCodes?.some((code) => code === '*' || code === permission) ?? false;
  const action = useCommandAction();
  const validation = useFormValidation();
  const [searchTerm, setSearchTerm] = useViewQueryState('truck-visits', 'search', '');
  // Gate staff need both scheduled trucks (to confirm arrival) and arrived ones, so start with all.
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const highlightRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!highlightTruckVisitId) return;
    setStatusFilter('ALL');
    setSearchTerm('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightTruckVisitId]);
  useEffect(() => {
    if (highlightTruckVisitId) highlightRef.current?.scrollIntoView({ block: 'center' });
  }, [highlightTruckVisitId, truckVisits.length]);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Arrive dialog state (TV-01)
  const [arriveTarget, setArriveTarget] = useState<{ id: string; vehiclePlate: string } | null>(
    null,
  );
  const [arriveLane, setArriveLane] = useState('');

  // Cancel dialog state
  const [cancelTruckTarget, setCancelTruckTarget] = useState<{
    id: string;
    vehiclePlate: string;
    visitCode: string;
  } | null>(null);

  // New Truck Visit form
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  const [phone, setPhone] = useState('');
  const [transporterId, setTransporterId] = useState('');
  const [type, setType] = useState<'GATE_IN' | 'GATE_OUT'>('GATE_IN');
  const [selectedContId, setSelectedContId] = useState<string>('');
  const [appointmentAt, setAppointmentAt] = useState(() =>
    vietnamDateTimeInput(Date.now() + 2 * 3600000),
  );
  const consumedTarget = useRef<string | null>(null);

  useEffect(() => {
    if (!targetVisitId) {
      consumedTarget.current = null;
      return;
    }
    if (!can('truck_visit.create') || consumedTarget.current === targetVisitId) return;
    const visit = containerVisits.find((v) => v.id === targetVisitId);
    if (visit) {
      consumedTarget.current = targetVisitId;
      setSelectedContId(targetVisitId);
      setType('GATE_IN');
      setShowCreateModal(true);
    }
  }, [targetVisitId, containerVisits, currentUser.permissionCodes]);

  const filteredVisits = truckVisits.filter((tv) => {
    const matchSearch =
      tv.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tv.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tv.visitCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || tv.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Container options: AUTHORIZED visits for GATE_IN, any for GATE_OUT
  const containerOptions: PickerOption[] = containerVisits
    .filter((v) => type === 'GATE_IN' ? v.state === 'AUTHORIZED' : true)
    .map((v) => ({
      value: v.id,
      label: v.containerNumber,
      description: `${v.containerType} · ${v.consigneeName} · ${businessLabel('containerVisitStatus', v.state)}`,
      keywords: v.mblNumber + ' ' + v.shippingLine,
      disabled: type === 'GATE_IN' && v.state !== 'AUTHORIZED',
      disabledReason:
        type === 'GATE_IN' && v.state !== 'AUTHORIZED'
          ? `Container ${businessLabel('containerVisitStatus', v.state)} — cần có lệnh được duyệt`
          : undefined,
    }));

  const selectedContainerVisit = containerVisits.find((v) => v.id === selectedContId);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can('truck_visit.create') || action.isPending() || !validation.validate(e.currentTarget))
      return;
    // Backend requires at least one container on the truck visit.
    if (!selectedContainerVisit) return;
    const isoAppt = vietnamDateTimeToIso(appointmentAt);
    const chosenTransporter = transporters.find((t) => t.id === transporterId);
    const result = await action.run(() =>
      createTruckVisit({
        vehiclePlate: plate,
        driverName: driver,
        driverPhone: phone,
        transporterName: chosenTransporter?.name || '',
        visitType: type,
        containerNumbers: selectedContainerVisit ? [selectedContainerVisit.containerNumber] : [],
        appointmentAt: isoAppt || undefined,
        gateLane: undefined,
      }),
    );
    if (result?.success) setShowCreateModal(false);
  };

  const statusBadge = (status: string) => {
    const colorMap: Record<string, string> = {
      SCHEDULED: 'bg-sky-100 text-sky-800 border border-sky-200',
      ARRIVED: 'bg-amber-100 text-amber-800 border border-amber-300',
      IN_PROGRESS: 'bg-blue-100 text-blue-800 border border-blue-200 animate-pulse',
      COMPLETED: 'bg-emerald-100 text-emerald-800',
      CANCELLED: 'bg-rose-100 text-rose-700',
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-bold ${colorMap[status] || 'bg-slate-100 text-slate-700'}`}
      >
        {businessLabel('truckVisitStatus', status)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Cancel truck visit dialog with required reason */}
      {cancelTruckTarget && (
        <ConfirmDialog
          title="Hủy chuyến xe"
          message="Thao tác này không thể hoàn tác. Chuyến xe sẽ bị hủy và phải tạo lại nếu cần."
          summary={[
            { label: 'Mã chuyến', value: cancelTruckTarget.visitCode },
            { label: 'Biển số xe', value: cancelTruckTarget.vehiclePlate },
          ]}
          reason={{
            label: 'Lý do hủy',
            placeholder: 'Nhập lý do hủy chuyến xe...',
            minLength: 5,
          }}
          confirmLabel="Xác nhận hủy chuyến"
          tone="danger"
          pending={action.pending}
          notice={action.notice}
          onClose={() => {
            if (!action.pending) setCancelTruckTarget(null);
          }}
          onConfirm={async (reason) => {
            const result = await action.run(() =>
              cancelTruckVisit(cancelTruckTarget.id, reason || 'Hủy chuyến xe'),
            );
            if (result?.success) setCancelTruckTarget(null);
          }}
        />
      )}

      {/* Arrive dialog with gate lane input (TV-01) */}
      {arriveTarget && (
        <ConfirmDialog
          title="Xác nhận xe đến cổng"
          message="Ghi nhận xe đã đến cổng. Hệ thống sẽ cập nhật trạng thái chuyến và thông báo nhân viên tiếp nhận."
          summary={[{ label: 'Biển số xe', value: arriveTarget.vehiclePlate }]}
          confirmLabel="Xác nhận xe đến"
          tone="primary"
          pending={action.pending}
          notice={action.notice}
          onClose={() => {
            if (!action.pending) setArriveTarget(null);
          }}
          onConfirm={async () => {
            const result = await action.run(() =>
              arriveTruckVisit(arriveTarget.id, arriveLane.trim() || undefined),
            );
            if (result?.success) {
              setArriveTarget(null);
              setArriveLane('');
            }
          }}
        >
          <div className="space-y-1">
            <label className="block text-sm font-semibold text-slate-700">
              Làn cổng (tùy chọn)
            </label>
            <input
              type="text"
              value={arriveLane}
              onChange={(e) => setArriveLane(e.target.value)}
              placeholder="Ví dụ: Làn 1, Cổng A..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </ConfirmDialog>
      )}

      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Truck className="w-5 h-5 text-blue-600" />
            <span>Quản lý Chuyến xe ra/vào</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Đặt lịch hẹn trước tại cổng nhằm rút ngắn thời gian xếp dỡ và tránh ùn tắc luồng xe.
          </p>
        </div>

        {can('truck_visit.create') && (
          <button
            onClick={() => {
              action.clear();
              setShowCreateModal(true);
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Chuyến xe mới</span>
          </button>
        )}
      </div>

      {/* Search + status filter tabs */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-4 text-xs">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm biển số xe, tên tài xế, mã chuyến..."
              aria-label="Tìm chuyến xe"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <span className="text-slate-400">
            <ConfirmedResourceValue resource="truckVisits">
              Hiển thị {filteredVisits.length} chuyến xe
            </ConfirmedResourceValue>
          </span>
        </div>
        {/* Status filter tabs (TV-03) */}
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((tab) => {
            const count =
              tab.value === 'ALL'
                ? truckVisits.length
                : truckVisits.filter((tv) => tv.status === tab.value).length;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                  statusFilter === tab.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className={`ml-1.5 px-1.5 py-0.5 rounded-full text-caption ${
                      statusFilter === tab.value ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {!showCreateModal && <CommandNotice notice={action.notice} />}
      <CollectionState
        resource="truckVisits"
        count={filteredVisits.length}
        total={truckVisits.length}
        filtered={!!searchTerm || statusFilter !== 'ALL'}
        onClear={() => {
          setSearchTerm('');
          setStatusFilter('ALL');
        }}
      />

      {/* Visits List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVisits.map((tv) => {
          const isOverdue =
            tv.appointmentAt &&
            tv.status === 'SCHEDULED' &&
            Date.now() - new Date(tv.appointmentAt).getTime() > 30 * 60 * 1000;
          return (
            <div
              key={tv.id}
              ref={tv.id === highlightTruckVisitId ? highlightRef : undefined}
              className={`bg-white rounded-xl border p-5 shadow-xs hover:border-blue-300 transition space-y-4 ${
                tv.id === highlightTruckVisitId ? 'border-blue-500 ring-2 ring-blue-300' : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span
                    className={`p-2 rounded-lg ${tv.visitType === 'GATE_IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'}`}
                  >
                    {tv.visitType === 'GATE_IN' ? (
                      <LogIn className="w-4 h-4" />
                    ) : (
                      <LogOut className="w-4 h-4" />
                    )}
                  </span>
                  <span className="font-mono font-bold text-sm text-slate-900">{tv.visitCode}</span>
                </div>
                {statusBadge(tv.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
                <div>
                  <span className="text-slate-400">Biển số xe:</span>{' '}
                  <strong className="text-slate-800 font-mono text-sm">{tv.vehiclePlate}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Tài xế:</span>{' '}
                  <strong className="text-slate-800">{tv.driverName}</strong> ({tv.driverPhone})
                </div>
                <div>
                  <span className="text-slate-400">Đơn vị vận tải:</span>{' '}
                  <strong className="text-slate-700">{tv.transporterName || '—'}</strong>
                </div>
                <div>
                  <span className="text-slate-400">Làn cổng:</span>{' '}
                  <strong className="text-blue-700">{tv.gateLane || 'Chưa ghi nhận làn'}</strong>
                </div>
                {tv.appointmentAt && (
                  <div className="col-span-2">
                    <span className="text-slate-400">Giờ hẹn:</span>{' '}
                    <strong className={isOverdue ? 'text-rose-700' : 'text-slate-700'}>
                      {new Date(tv.appointmentAt).toLocaleString('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {isOverdue && ' — Quá giờ hẹn'}
                    </strong>
                  </div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-500">Container mang theo:</span>{' '}
                    <span className="font-mono font-bold text-blue-700">
                      {tv.containerNumbers.join(', ')}
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 justify-end">
                  {tv.status === 'SCHEDULED' && can('truck_visit.arrive') && (
                    <button
                      disabled={action.pending}
                      onClick={() => {
                        setArriveLane('');
                        setArriveTarget({ id: tv.id, vehiclePlate: tv.vehiclePlate });
                      }}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded shadow-xs"
                    >
                      Xác nhận xe đến cổng
                    </button>
                  )}
                  {tv.status === 'SCHEDULED' && can('truck_visit.cancel') && (
                    <button
                      disabled={action.pending}
                      onClick={() =>
                        setCancelTruckTarget({
                          id: tv.id,
                          vehiclePlate: tv.vehiclePlate,
                          visitCode: tv.visitCode,
                        })
                      }
                      className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded border border-rose-200"
                    >
                      Hủy chuyến
                    </button>
                  )}
                  {tv.status === 'ARRIVED' && tv.visitType === 'GATE_IN' && (
                    <button
                      onClick={() => {
                        const linkedVisit = containerVisits.find((v) =>
                          tv.containerNumbers.includes(v.containerNumber),
                        );
                        if (linkedVisit) onNavigate('gate-in', linkedVisit.id);
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-xs"
                    >
                      Tiến hành Tiếp nhận vào cổng →
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <ModalOverlay
          aria-labelledby="truck-visits-dialog-1-title"
          pending={action.pending}
          onClose={() => {
            if (!action.isPending()) setShowCreateModal(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3
              id="truck-visits-dialog-1-title"
              className="text-base font-bold text-slate-900 mb-4"
            >
              Tạo Lịch hẹn Chuyến xe
            </h3>
            <form noValidate onSubmit={handleCreate} className="space-y-3">
              <FormErrors errors={validation.errors} />
              <CommandNotice notice={action.notice} />
              <fieldset disabled={action.pending} className="space-y-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Loại chuyến xe</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      aria-pressed={type === 'GATE_IN'}
                      onClick={() => setType('GATE_IN')}
                      className={`py-2 rounded-lg font-bold border transition ${
                        type === 'GATE_IN'
                          ? 'bg-emerald-50 border-emerald-600 text-emerald-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Chuyến vào cổng
                    </button>
                    <button
                      type="button"
                      aria-pressed={type === 'GATE_OUT'}
                      onClick={() => setType('GATE_OUT')}
                      className={`py-2 rounded-lg font-bold border transition ${
                        type === 'GATE_OUT'
                          ? 'bg-blue-50 border-blue-600 text-blue-800'
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      Chuyến ra cổng
                    </button>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="truck-visits-plate"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Biển số đầu kéo*
                  </label>
                  <input
                    {...validation.props('truck-visits-plate')}
                    id="truck-visits-plate"
                    type="text"
                    required
                    value={plate}
                    onChange={(e) => setPlate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="truck-visits-driver"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Tên tài xế*
                    </label>
                    <input
                      {...validation.props('truck-visits-driver')}
                      id="truck-visits-driver"
                      type="text"
                      required
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="truck-visits-phone"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Số điện thoại*
                    </label>
                    <input
                      {...validation.props('truck-visits-phone')}
                      id="truck-visits-phone"
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>

                {/* Transporter from master data (TV-02) */}
                <div>
                  <label
                    htmlFor="truck-visits-transporter"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Hãng vận tải
                  </label>
                  <select
                    id="truck-visits-transporter"
                    value={transporterId}
                    onChange={(e) => setTransporterId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">— Chọn hãng vận tải —</option>
                    {transporters
                      .filter((t) => t.active)
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Container searchable select (TV-02) */}
                <SearchableSelect
                  label={type === 'GATE_IN' ? 'Container vào cổng (đã được duyệt)*' : 'Container ra cổng*'}
                  options={containerOptions}
                  value={selectedContId}
                  onChange={setSelectedContId}
                  placeholder="Tìm theo số container, khách hàng, B/L..."
                  required
                  emptyText="Không tìm thấy container phù hợp."
                  hint={
                    type === 'GATE_IN'
                      ? 'Chỉ hiển thị container đã có lệnh được duyệt.'
                      : undefined
                  }
                />

                {/* Appointment datetime (TV-02) */}
                <div>
                  <label
                    htmlFor="truck-visits-appointment"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Giờ hẹn tại cổng
                  </label>
                  <input
                    id="truck-visits-appointment"
                    type="datetime-local"
                    value={appointmentAt}
                    onChange={(e) => setAppointmentAt(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </fieldset>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={action.pending}
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={action.pending || !selectedContId}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50"
                >
                  {action.pending ? 'Đang lưu…' : 'Lưu Chuyến Xe'}
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
