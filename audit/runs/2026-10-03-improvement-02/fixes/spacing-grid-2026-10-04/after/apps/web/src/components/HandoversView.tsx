import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { ReadOnlyNotice } from './ReadOnlyNotice';
import { TransportHandover, HandoverStatus } from '../types';
import {
  Plus,
  Search,
  CheckCircle2,
  Building2,
  Warehouse,
  FileCheck,
  ExternalLink,
} from 'lucide-react';
import { NavTabId } from './Sidebar';

import { useCommandAction, CommandNotice } from './useCommandAction';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState, ConfirmedResourceValue, DetailAvailability } from './CollectionState';
import { API_BASE_URL } from '../services/api/client';

interface HandoversViewProps {
  onNavigate: (tab: NavTabId, contextId?: string) => void;
  targetHandoverId?: string;
}

export const HandoversView: React.FC<HandoversViewProps> = ({ onNavigate, targetHandoverId }) => {
  const {
    currentUser,
    handovers,
    resourceStatus,
    isLoading,
    refreshData,
    detailStatus,
    partnerClients,
    warehouses,
    containerVisits,
    createHandover,
    publishHandover,
    icdConfirmHandover,
  } = useApp();
  const can = (permission: string) => currentUser.permissionCodes?.some(code => code === '*' || code === permission) ?? false;

  const action = useCommandAction();
  const validation = useFormValidation();
  const [searchTerm, setSearchTerm] = useViewQueryState('handovers', 'search', '');
  const [statusFilter, setStatusFilter] = useViewQueryState('handovers', 'status', 'ALL');
  const [selectedHandoverState, setSelectedHandover] = useState<TransportHandover | null>(
    targetHandoverId
      ? handovers.find((h) => h.id === targetHandoverId) ?? null
      : handovers[0] ?? null,
  );
  // An explicit destination must never borrow the first unrelated entity.
  const selectedHandover = targetHandoverId
    ? handovers.find((h) => h.id === targetHandoverId) ?? null
    : selectedHandoverState;
  const handoverLoadState = resourceStatus?.handovers ?? (isLoading ? 'loading' : 'ready');

  useEffect(() => {
    setSelectedHandover(
      (previous) =>
        targetHandoverId
          ? handovers.find((h) => h.id === targetHandoverId) ?? null
          : handovers.find((h) => h.id === previous?.id) ?? handovers[0] ?? null,
    );
  }, [handovers, targetHandoverId]);
  const detailReady =
    selectedHandover &&
    (!detailStatus?.handovers?.[selectedHandover.id] ||
      detailStatus.handovers[selectedHandover.id] === 'ready');

  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Handover form
  const [selectedContVisitId, setSelectedContVisitId] = useState(
    containerVisits.find((c) => c.state === 'EXITED')?.id || containerVisits[0]?.id || '',
  );
  const [selectedPartnerClientId, setSelectedPartnerClientId] = useState(
    partnerClients[0]?.id || '',
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(warehouses[0]?.id || '');
  const [transportCodeInput, setTransportCodeInput] = useState('');

  const filteredHandovers = handovers.filter((h) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCode = h.transportCode.toLowerCase().includes(q);
      const matchCont = h.containerNumber.toLowerCase().includes(q);
      const matchPartner = h.partnerName.toLowerCase().includes(q);
      if (!matchCode && !matchCont && !matchPartner) return false;
    }
    if (statusFilter !== 'ALL' && h.status !== statusFilter) return false;
    return true;
  });

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can('handover.create') || action.isPending() || !validation.validate(e.currentTarget)) return;
    const cont = containerVisits.find((c) => c.id === selectedContVisitId);
    const client = partnerClients.find((p) => p.id === selectedPartnerClientId);
    const wh = warehouses.find((w) => w.id === selectedWarehouseId);
    if (!cont || !client || !wh) return;

    const res = await action.run(() =>
      createHandover({
        containerVisitId: cont.id,
        partnerClientId: client.id,
        warehouseId: wh.id,
        transportCode: transportCodeInput.trim().toUpperCase(),
        publishNow: false,
      }),
    );

    if (res?.success && res.handover) {
      setSelectedHandover(res.handover);
      setShowCreateModal(false);
    }
  };

  const handlePublish = async () => {
    if (!can('handover.create') || !selectedHandover) return;
    await action.run(() => publishHandover(selectedHandover.id));
  };

  const handleIcdConfirm = async () => {
    if (!can('handover.confirm') || !selectedHandover) return;
    await action.run(() =>
      icdConfirmHandover(selectedHandover.id, 'ICD xác nhận hoàn tất bàn giao.'),
    );
  };

  const getStatusBadge = (status: HandoverStatus) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            DRAFT
          </span>
        );
      case 'READY_FOR_HANDOVER':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            READY_FOR_HANDOVER
          </span>
        );
      case 'PARTNER_ACCEPTED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
            PARTNER_ACCEPTED
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 animate-pulse">
            IN_TRANSIT
          </span>
        );
      case 'PARTNER_CONFIRMED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
            CONFIRMED (CHỜ DUYỆT)
          </span>
        );
      case 'ICD_CONFIRMED':
      case 'COMPLETED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            COMPLETED
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  const getStepNumber = (status: HandoverStatus) => {
    switch (status) {
      case 'DRAFT':
        return 1;
      case 'READY_FOR_HANDOVER':
        return 2;
      case 'PARTNER_ACCEPTED':
        return 3;
      case 'IN_TRANSIT':
        return 4;
      case 'PARTNER_CONFIRMED':
        return 5;
      case 'ICD_CONFIRMED':
      case 'COMPLETED':
        return 6;
      default:
        return 1;
    }
  };

  return (
    <div className="space-y-6">
      {!showCreateModal && <CommandNotice notice={action.notice} />}
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-indigo-600 text-white font-mono font-bold text-xs rounded">
              BÀN GIAO ĐỐI TÁC
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Bàn giao Vận chuyển Ngoài ICD (Partner Handover)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý quy trình ủy thác container cho đối tác vận tải ngoài, giao tiếp API và nghiệm
            thu biên bản giao nhận (POD)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={`${API_BASE_URL.replace(/\/$/, '')}/docs`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-lg border border-slate-300 text-sm font-semibold"
          >
            Tài liệu API
          </a>
          <button
            hidden={!can('handover.create')}
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Lệnh Bàn giao mới</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <ReadOnlyNotice writePermissions={['handover.create', 'handover.publish', 'handover.icd_confirm', 'handover.complete', 'handover.dispute']} />
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm mã VC, số cont, đối tác..."
              aria-label="Tìm lệnh bàn giao"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <select
            aria-label="Lọc trạng thái bàn giao"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="DRAFT">DRAFT (Nháp)</option>
            <option value="READY_FOR_HANDOVER">READY_FOR_HANDOVER (Chờ đối tác nhận)</option>
            <option value="PARTNER_ACCEPTED">PARTNER_ACCEPTED (Đã nhận)</option>
            <option value="IN_TRANSIT">IN_TRANSIT (Đang vận chuyển)</option>
            <option value="PARTNER_CONFIRMED">PARTNER_CONFIRMED (Chờ duyệt POD)</option>
            <option value="ICD_CONFIRMED">ICD_CONFIRMED (Đã nghiệm thu)</option>
            <option value="COMPLETED">COMPLETED (Đã hoàn tất)</option>
          </select>
        </div>

        <span className="text-slate-400"><ConfirmedResourceValue resource="handovers">Hiển thị {filteredHandovers.length} lệnh bàn giao</ConfirmedResourceValue></span>
      </div>

      {/* Layout: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Handovers List */}
        <div className="space-y-3">
          <CollectionState
            resource="handovers"
            count={filteredHandovers.length}
            total={handovers.length}
            filtered={!!searchTerm || statusFilter !== 'ALL'}
            onClear={() => {
              setSearchTerm('');
              setStatusFilter('ALL');
            }}
          />
          {filteredHandovers.map((h) => {
            const isSelected = selectedHandover?.id === h.id;
            return (
              <button
                type="button"
                aria-pressed={isSelected}
                key={h.id}
                disabled={action.pending}
                onClick={() => {
                  setSelectedHandover(h);
                  onNavigate('handovers', h.id);
                }}
                className={`block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 p-4 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-indigo-50/50 border-indigo-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="block flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-indigo-700">
                    {h.transportCode}
                  </span>
                  {getStatusBadge(h.status)}
                </span>
                <span className="block font-mono font-bold text-slate-900 text-xs mt-2 flex items-center space-x-2">
                  <span>{h.containerNumber}</span>
                  <span className="font-sans font-normal text-slate-400">({h.containerType})</span>
                </span>
                <span className="block text-caption text-slate-600 mt-2 space-y-1">
                  <span className="block">
                    Đối tác: <strong>{h.partnerName}</strong>
                  </span>
                  <span className="block">
                    Đích đến: <strong>{h.warehouseName}</strong>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Right 2 Columns: Handover State Machine Inspection */}
        <div className="lg:col-span-2">
          {selectedHandover ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs">
              <DetailAvailability resource="handovers" id={selectedHandover.id} />
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-4 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-mono font-bold text-slate-900">
                      {selectedHandover.transportCode}
                    </h3>
                    {getStatusBadge(selectedHandover.status)}
                  </div>
                  <p className="text-slate-500 mt-1">
                    Hồ sơ Container:{' '}
                    <strong className="font-mono text-slate-800">
                      {selectedHandover.containerNumber}
                    </strong>{' '}
                    ({selectedHandover.containerType})
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onNavigate('containers', selectedHandover.containerVisitId)}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center space-x-1"
                  >
                    <span>Xem Hồ sơ Container</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* State Machine Stepper */}
              <div>
                <div className="font-bold text-slate-700 uppercase tracking-wider text-caption mb-3">
                  Tiến trình Vòng đời Bàn giao (State Machine Lifecycle)
                </div>
                <div className="grid grid-cols-6 gap-2 text-center">
                  {[
                    { key: 'DRAFT', label: '1. Bản nháp' },
                    { key: 'READY_FOR_HANDOVER', label: '2. Sẵn sàng' },
                    { key: 'PARTNER_ACCEPTED', label: '3. Đã nhận' },
                    { key: 'IN_TRANSIT', label: '4. Đang đi' },
                    { key: 'PARTNER_CONFIRMED', label: '5. Đã giao kho' },
                    { key: 'COMPLETED', label: '6. Nghiệm thu' },
                  ].map((step, idx) => {
                    const currentStepNum = getStepNumber(selectedHandover.status);
                    const isPassed = idx + 1 <= currentStepNum;
                    const isCurrent = idx + 1 === currentStepNum;

                    return (
                      <div
                        key={step.key}
                        className={`p-2 rounded-lg border font-semibold text-caption transition ${
                          isCurrent
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : isPassed
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}
                      >
                        {step.label}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Handover Details Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Đối tác Vận tải ngoài</span>
                  </div>
                  <div>
                    Tên đối tác: <strong>{selectedHandover.partnerName}</strong>
                  </div>
                  <div>
                    Mã đối tác:{' '}
                    <strong className="font-mono text-indigo-700">
                      {selectedHandover.partnerClientId}
                    </strong>
                  </div>
                  <div>
                    Ghi chú đơn:{' '}
                    <span className="text-slate-600">{selectedHandover.notes || 'Không có'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center space-x-2">
                    <Warehouse className="w-4 h-4 text-blue-600" />
                    <span>Kho nhận hàng đích</span>
                  </div>
                  <div>
                    Tên kho nhận: <strong>{selectedHandover.warehouseName}</strong>
                  </div>
                  <div>
                    Địa chỉ kho:{' '}
                    <span className="text-slate-600">{selectedHandover.warehouseAddress}</span>
                  </div>
                  <div>
                    Dự kiến đến kho:{' '}
                    <span className="text-slate-700 font-semibold">
                      {selectedHandover.expectedDeliveryAt
                        ? new Date(selectedHandover.expectedDeliveryAt).toLocaleString('vi-VN')
                        : 'Chưa có lịch hẹn'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Operational Action Bar (Depending on current state) */}
              <div className="bg-indigo-50/70 border border-indigo-200 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="font-bold text-indigo-950">Trạng thái bàn giao:</div>
                  <div className="text-indigo-800 text-caption">
                    {selectedHandover.status === 'DRAFT' &&
                      'Chuyển sang READY_FOR_HANDOVER để khóa dữ liệu và cấp API token cho đối tác.'}
                    {selectedHandover.status === 'READY_FOR_HANDOVER' &&
                      'Đối tác nhận và xác nhận lệnh qua API tích hợp.'}
                    {selectedHandover.status === 'PARTNER_ACCEPTED' &&
                      'Xe đã nhận container, xuất bãi và khởi hành trên đường.'}
                    {selectedHandover.status === 'IN_TRANSIT' &&
                      'Xe đã đến kho đích. Đối tác nộp biên bản giao nhận POD.'}
                    {selectedHandover.status === 'PARTNER_CONFIRMED' &&
                      'Đối tác báo đã giao kho. ICD kiểm tra biên nhận và xác nhận nghiệm thu.'}
                    {(selectedHandover.status === 'ICD_CONFIRMED' ||
                      selectedHandover.status === 'COMPLETED') &&
                      'ICD đã xác nhận hoàn tất bàn giao. Xem lịch sử xác nhận bên dưới.'}
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {selectedHandover.status === 'DRAFT' && (
                    <button
                      hidden={!can('handover.create')}
                      disabled={action.pending}
                      onClick={handlePublish}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs"
                    >
                      Sẵn sàng Bàn giao
                    </button>
                  )}

                  {['READY_FOR_HANDOVER', 'PARTNER_ACCEPTED', 'IN_TRANSIT'].includes(
                    selectedHandover.status,
                  ) && (
                    <p className="text-sm text-indigo-700">
                      Đang chờ xác nhận qua API của đối tác. Dùng Tải lại dữ liệu để cập nhật tiến
                      trình.
                    </p>
                  )}

                  {selectedHandover.status === 'PARTNER_CONFIRMED' && (
                    <button
                      hidden={!can('handover.confirm')}
                      disabled={action.pending}
                      onClick={handleIcdConfirm}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center space-x-2"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Duyệt Nghiệm thu POD (COMPLETED)</span>
                    </button>
                  )}

                  {(selectedHandover.status === 'ICD_CONFIRMED' ||
                    selectedHandover.status === 'COMPLETED') && (
                    <span className="px-3 py-2 bg-emerald-100 text-emerald-800 font-bold rounded-lg flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đã hoàn tất</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Confirmations & Milestones History */}
              <div className="space-y-3">
                <div className="font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-1">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span>Biên bản & Lịch sử Xác nhận Bàn giao (Confirmations Timeline)</span>
                </div>

                {!detailReady ? (
                  <p className="text-slate-700">Chưa tải đầy đủ lịch sử xác nhận.</p>
                ) : selectedHandover.confirmations.length === 0 ? (
                  <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-xl">
                    Chưa phát sinh mốc xác nhận nào
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedHandover.confirmations.map((conf) => (
                      <div
                        key={conf.id}
                        className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-800 font-mono font-bold text-caption rounded">
                              {conf.confirmationType}
                            </span>
                            <span className="font-bold text-slate-800">{conf.actor}</span>
                          </div>
                          <span className="text-slate-400 text-caption">
                            {new Date(conf.confirmedAt).toLocaleString('vi-VN')}
                          </span>
                        </div>

                        <div className="text-slate-700">{conf.note || 'Xác nhận hợp lệ'}</div>

                        {conf.proofImageUrl && (
                          <div className="text-indigo-600 font-semibold flex items-center pt-1 text-caption">
                            ✓ Đã đính kèm ảnh POD & Chữ ký giao nhận
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : targetHandoverId ? (
            <div
              role={handoverLoadState === 'loading' ? 'status' : 'alert'}
              className="bg-white rounded-xl border border-slate-200 p-6 text-sm text-slate-700 space-y-3"
            >
              <p>
                {handoverLoadState === 'loading'
                  ? 'Đang tải lệnh bàn giao được yêu cầu…'
                  : handoverLoadState === 'forbidden'
                    ? 'Bạn không có quyền xem lệnh bàn giao này.'
                    : handoverLoadState === 'error' || handoverLoadState === 'stale'
                      ? 'Chưa tải được lệnh bàn giao được yêu cầu. Hãy tải lại dữ liệu để kiểm tra.'
                      : 'Không tìm thấy lệnh bàn giao được yêu cầu. Hãy quay về danh sách để chọn lại.'}
              </p>
              <div className="flex flex-wrap gap-3">
                {(handoverLoadState === 'error' || handoverLoadState === 'stale') && (
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => void refreshData()}
                    className="font-semibold text-blue-700 underline disabled:opacity-50"
                  >
                    Tải lại lệnh bàn giao
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onNavigate('handovers')}
                  className="font-semibold text-blue-700 underline"
                >
                  Quay về danh sách
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Chọn một Lệnh bàn giao bên trái để xem chi tiết
            </div>
          )}
        </div>
      </div>

      {/* Create Handover Modal */}
      {showCreateModal && (
        <ModalOverlay
          aria-labelledby="handovers-dialog-1-title"
          pending={action.pending}
          onClose={() => {
            if (!action.isPending()) setShowCreateModal(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="handovers-dialog-1-title" className="text-base font-bold text-slate-900 mb-2">
              Tạo lệnh bàn giao vận chuyển ngoài
            </h3>
            <p className="text-slate-500 mb-4">
              Khởi tạo hồ sơ ủy thác container ra ngoài ICD cho đối tác vận tải chuyển đến kho nhận
              đích.
            </p>

            <form noValidate onSubmit={handleCreate} className="space-y-4">
              <FormErrors errors={validation.errors} />
              <CommandNotice notice={action.notice} />
              <fieldset disabled={action.pending} className="space-y-4">
                <div>
                  <label
                    htmlFor="handovers-transport-code-input"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Mã chuyến vận chuyển*
                  </label>
                  <input
                    id="handovers-transport-code-input"
                    {...validation.props('handovers-transport-code-input')}
                    type="text"
                    required
                    value={transportCodeInput}
                    onChange={(e) => setTransportCodeInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono font-bold"
                  />
                </div>

                <div>
                  <label
                    htmlFor="handovers-selected-cont-visit-id"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Chọn Container cần bàn giao*
                  </label>
                  <select
                    required
                    {...validation.props('handovers-selected-cont-visit-id')}
                    id="handovers-selected-cont-visit-id"
                    value={selectedContVisitId}
                    onChange={(e) => setSelectedContVisitId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                  >
                    {containerVisits.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.containerNumber} — {c.consigneeName} ({c.state})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="handovers-selected-partner-client-id"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Đối tác vận tải (Partner)*
                    </label>
                    <select
                      required
                      {...validation.props('handovers-selected-partner-client-id')}
                      id="handovers-selected-partner-client-id"
                      value={selectedPartnerClientId}
                      onChange={(e) => setSelectedPartnerClientId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                    >
                      {partnerClients.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.partnerName} ({p.partnerCode})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="handovers-selected-warehouse-id"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Kho nhận đích (Warehouse)*
                    </label>
                    <select
                      required
                      {...validation.props('handovers-selected-warehouse-id')}
                      id="handovers-selected-warehouse-id"
                      value={selectedWarehouseId}
                      onChange={(e) => setSelectedWarehouseId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </fieldset>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={action.pending}
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={action.pending}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                >
                  Tạo Lệnh Bàn Giao
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
