import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ReadOnlyNotice } from './ReadOnlyNotice';
import { TransportHandover, HandoverStatus, TransportConfirmation } from '../types';
import {
  Plus,
  Search,
  CheckCircle2,
  Building2,
  Warehouse,
  FileCheck,
  ExternalLink,
  AlertTriangle,
  XCircle,
  Clock,
} from 'lucide-react';
import { NavTabId } from './Sidebar';
import { formatVietnamDateTime, vietnamDateTimeInput, vietnamDateTimeToIso } from '../lib/time';

import { useCommandAction, CommandNotice } from './useCommandAction';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState, ConfirmedResourceValue, DetailAvailability } from './CollectionState';
import { API_BASE_URL } from '../services/api/client';
import { ConfirmDialog } from './ConfirmDialog';
import { businessLabel, TONE_CLASSES, businessTone } from '../lib/business-labels';

interface HandoversViewProps {
  onNavigate: (tab: NavTabId, contextId?: string) => void;
  targetHandoverId?: string;
  /** When set (navigated from a container detail), opens create form with that container preselected. */
  targetVisitId?: string;
}

// Vietnamese labels for container states in create form
const CONTAINER_STATE_VI: Record<string, string> = {
  EXITED: 'Đã ra cổng',
  GATE_PASS_ISSUED: 'Đã cấp phiếu ra cổng',
  IN_YARD: 'Đang ở bãi',
  PENDING: 'Chờ duyệt lệnh',
  AUTHORIZED: 'Đã duyệt – chờ vào cổng',
  IN_STRIPPING: 'Đang rút hàng',
  UNDER_INSPECTION: 'Đang kiểm định',
  STRIPPED: 'Đã rút hàng xong',
  CANCELLED: 'Đã hủy',
};

// Dispute reason codes as offered to operators
const DISPUTE_REASONS = [
  { code: 'WRONG_CONTAINER', label: 'Sai container' },
  { code: 'WRONG_WAREHOUSE', label: 'Sai kho nhận' },
  { code: 'TIMING_MISMATCH', label: 'Thời gian không hợp lý' },
  { code: 'PROOF_INSUFFICIENT', label: 'Biên bản POD không đủ' },
  { code: 'SEAL_TAMPERED', label: 'Niêm phong bị xáo trộn' },
  { code: 'TRANSPORT_CODE_MISMATCH', label: 'Mã vận chuyển không khớp' },
];

// Quick filter tab definitions
type QuickTabKey = 'ALL' | 'READY' | 'TRANSITING' | 'PENDING_ICD' | 'DISPUTED' | 'DONE' | 'EXCEPTION';
interface QuickTab { key: QuickTabKey; label: string; statuses: HandoverStatus[] }
const QUICK_TABS: QuickTab[] = [
  { key: 'ALL',         label: 'Tất cả',               statuses: [] },
  { key: 'READY',       label: 'Sẵn sàng bàn giao',    statuses: ['READY_FOR_HANDOVER'] },
  { key: 'TRANSITING',  label: 'Đang vận chuyển',       statuses: ['PARTNER_ACCEPTED', 'IN_TRANSIT'] },
  { key: 'PENDING_ICD', label: 'Chờ ICD xác nhận',      statuses: ['PARTNER_CONFIRMED'] },
  { key: 'DISPUTED',    label: 'Tranh chấp',            statuses: ['DISPUTED'] },
  { key: 'DONE',        label: 'Hoàn tất',              statuses: ['ICD_CONFIRMED', 'COMPLETED'] },
  { key: 'EXCEPTION',   label: 'Ngoại lệ',              statuses: ['PARTNER_REJECTED', 'DELIVERY_FAILED', 'CANCELLED'] },
];

function getStepNumber(status: HandoverStatus): number | null {
  switch (status) {
    case 'DRAFT': return 1;
    case 'READY_FOR_HANDOVER': return 2;
    case 'PARTNER_ACCEPTED': return 3;
    case 'IN_TRANSIT': return 4;
    case 'PARTNER_CONFIRMED': return 5;
    case 'ICD_CONFIRMED':
    case 'COMPLETED': return 6;
    default: return null; // exception/terminal states
  }
}

function formatDt(dt: string | null | undefined): string | null {
  if (!dt) return null;
  return formatVietnamDateTime(dt);
}

/** Haversine distance in metres between two lat/lon points */
function haversineM(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ConfirmationDetail({ conf, warehouseLat, warehouseLon }: {
  conf: TransportConfirmation;
  warehouseLat?: number;
  warehouseLon?: number;
}) {
  const typeLabel = businessLabel('transportConfirmationType', conf.confirmationType);
  const typeTone = businessTone('transportConfirmationType', conf.confirmationType);

  let gpsWarningM: number | null = null;
  if (
    conf.confirmationType === 'WAREHOUSE_RECEIVED' &&
    conf.latitude != null && conf.longitude != null &&
    warehouseLat != null && warehouseLon != null
  ) {
    const dist = haversineM(conf.latitude, conf.longitude, warehouseLat, warehouseLon);
    if (dist > 500) gpsWarningM = Math.round(dist);
  }

  return (
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded text-caption font-bold ring-1 ${TONE_CLASSES[typeTone]}`}>
            {typeLabel}
          </span>
          <span className="font-bold text-slate-800 text-xs">{conf.actor}</span>
        </div>
        <span className="text-slate-400 text-caption">{formatVietnamDateTime(conf.confirmedAt)}</span>
      </div>

      {conf.confirmationType === 'WAREHOUSE_RECEIVED' && (
        <div className="mt-2 grid grid-cols-2 gap-2 text-caption text-slate-700">
          {conf.receiverName && (
            <div>Người nhận: <strong>{conf.receiverName}</strong>{conf.receiverPhone ? ` · ${conf.receiverPhone}` : ''}</div>
          )}
          {conf.vehiclePlate && (
            <div>Xe: <strong className="font-mono">{conf.vehiclePlate}</strong>{conf.driverName ? ` / ${conf.driverName}` : ''}</div>
          )}
          {conf.latitude != null && conf.longitude != null && (
            <div className="col-span-2 flex items-center gap-1">
              <span>GPS: {conf.latitude.toFixed(5)}, {conf.longitude.toFixed(5)}</span>
              {conf.accuracyM != null && <span className="text-slate-400">(±{conf.accuracyM}m)</span>}
              {gpsWarningM !== null && (
                <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-semibold ring-1 ring-amber-200">
                  ⚠ Lệch kho {gpsWarningM}m
                </span>
              )}
            </div>
          )}
          {(conf.proofImageUrl || conf.signatureUrl) && (
            <div className="col-span-2 flex gap-3">
              {conf.proofImageUrl && (
                <a href={conf.proofImageUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">
                  Xem ảnh POD
                </a>
              )}
              {conf.signatureUrl && (
                <a href={conf.signatureUrl} target="_blank" rel="noreferrer" className="text-indigo-600 underline font-semibold">
                  Xem chữ ký
                </a>
              )}
            </div>
          )}
        </div>
      )}

      {conf.confirmationType === 'DISPUTE' && (
        <div className="mt-1 p-2 bg-amber-50 border border-amber-200 rounded text-caption text-amber-900">
          Lý do tranh chấp: <strong>{conf.reasonCode ?? '—'}</strong>
        </div>
      )}

      {conf.note && conf.confirmationType !== 'DISPUTE' && (
        <div className="text-slate-600 text-caption">{conf.note}</div>
      )}
      {conf.confirmationType === 'DISPUTE' && conf.note && (
        <div className="text-amber-800 text-caption">{conf.note}</div>
      )}

      {!conf.note && conf.confirmationType !== 'WAREHOUSE_RECEIVED' && conf.confirmationType !== 'DISPUTE' && (
        <div className="text-slate-500 text-caption">Xác nhận hợp lệ</div>
      )}
    </div>
  );
}

export const HandoversView: React.FC<HandoversViewProps> = ({ onNavigate, targetHandoverId, targetVisitId }) => {
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
    disputeHandover,
  } = useApp();
  const can = (permission: string) => currentUser.permissionCodes?.some(code => code === '*' || code === permission) ?? false;

  const action = useCommandAction();
  const validation = useFormValidation();
  const [searchTerm, setSearchTerm] = useViewQueryState('handovers', 'search', '');
  const [quickTabState, setQuickTabState] = useViewQueryState('handovers', 'tab', 'ALL');
  const quickTab = quickTabState as QuickTabKey;
  const [partnerFilter, setPartnerFilter] = useViewQueryState('handovers', 'partner', 'ALL');
  const [warehouseFilter, setWarehouseFilter] = useViewQueryState('handovers', 'warehouse', 'ALL');

  const [selectedHandoverState, setSelectedHandover] = useState<TransportHandover | null>(
    targetHandoverId
      ? handovers.find((h) => h.id === targetHandoverId) ?? null
      : handovers[0] ?? null,
  );
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

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showIcdConfirmDialog, setShowIcdConfirmDialog] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputeReasonCode, setDisputeReasonCode] = useState(DISPUTE_REASONS[0].code);
  const [disputeNoteText, setDisputeNoteText] = useState('');

  // Create form state
  const publishNowRef = useRef(false);
  const [selectedContVisitId, setSelectedContVisitId] = useState(() => {
    if (targetVisitId) return targetVisitId;
    const hasOpenHandover = (visitId: string) =>
      handovers.some((h) => h.containerVisitId === visitId && h.status !== 'COMPLETED' && h.status !== 'CANCELLED');
    return containerVisits.find((c) => c.state === 'EXITED' && !hasOpenHandover(c.id))?.id ?? '';
  });
  const [selectedPartnerClientId, setSelectedPartnerClientId] = useState(
    partnerClients.find((p) => p.status === 'ACTIVE')?.id ?? partnerClients[0]?.id ?? '',
  );
  const [selectedWarehouseId, setSelectedWarehouseId] = useState(
    warehouses.find((w) => w.active)?.id ?? warehouses[0]?.id ?? '',
  );
  const [transportCodeInput, setTransportCodeInput] = useState('');
  const [expectedDeliveryAtInput, setExpectedDeliveryAtInput] = useState(() =>
    vietnamDateTimeInput(Date.now() + 24 * 60 * 60 * 1000),
  );

  // Auto-open create modal when targetVisitId is provided
  useEffect(() => {
    if (targetVisitId) {
      setSelectedContVisitId(targetVisitId);
      setShowCreateModal(true);
    }
    // Only run on mount or when targetVisitId changes
  }, [targetVisitId]);

  // Backend only accepts EXITED containers without another open handover; explain instead of failing on submit.
  const openHandoverByVisit = new Map(
    handovers
      .filter((h) => h.status !== 'COMPLETED' && h.status !== 'CANCELLED')
      .map((h) => [h.containerVisitId, h.transportCode] as const),
  );
  const handoverBlockReason = (visitId: string): string | null => {
    const visit = containerVisits.find((c) => c.id === visitId);
    if (!visit) return 'Chọn container cần bàn giao.';
    if (visit.state !== 'EXITED') return 'Container chưa ra cổng — chỉ bàn giao được container đã ra khỏi ICD.';
    const openCode = openHandoverByVisit.get(visitId);
    if (openCode) return `Container đã có lệnh bàn giao ${openCode} đang xử lý.`;
    return null;
  };
  const selectedHandoverBlock = selectedContVisitId ? handoverBlockReason(selectedContVisitId) : null;

  // Sort containers: EXITED first (most relevant for handover)
  const sortedContainerVisits = [...containerVisits].sort((a, b) => {
    const aScore = a.state === 'EXITED' ? 0 : 1;
    const bScore = b.state === 'EXITED' ? 0 : 1;
    return aScore - bScore;
  });

  // Filter logic
  const filteredHandovers = handovers.filter((h) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (
        !h.transportCode.toLowerCase().includes(q) &&
        !h.containerNumber.toLowerCase().includes(q) &&
        !h.partnerName.toLowerCase().includes(q)
      ) return false;
    }
    if (partnerFilter !== 'ALL' && h.partnerClientId !== partnerFilter) return false;
    if (warehouseFilter !== 'ALL' && h.warehouseId !== warehouseFilter) return false;
    if (quickTab !== 'ALL') {
      const tab = QUICK_TABS.find((t) => t.key === quickTab);
      if (tab && tab.statuses.length > 0 && !tab.statuses.includes(h.status)) return false;
    }
    return true;
  });

  // Tab badge counts
  const tabCount = (tab: QuickTab): number =>
    tab.key === 'ALL' ? handovers.length : handovers.filter((h) => tab.statuses.includes(h.status)).length;

  // Handlers
  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can('handover.create') || action.isPending() || !validation.validate(e.currentTarget)) return;
    if (handoverBlockReason(selectedContVisitId)) return;
    const cont = containerVisits.find((c) => c.id === selectedContVisitId);
    const client = partnerClients.find((p) => p.id === selectedPartnerClientId);
    const wh = warehouses.find((w) => w.id === selectedWarehouseId);
    if (!cont || !client || !wh) return;
    const willPublish = publishNowRef.current;

    const res = await action.run(() =>
      createHandover({
        containerVisitId: cont.id,
        partnerClientId: client.id,
        warehouseId: wh.id,
        transportCode: transportCodeInput.trim().toUpperCase(),
        expectedDeliveryAt: (expectedDeliveryAtInput && vietnamDateTimeToIso(expectedDeliveryAtInput)) || undefined,
        publishNow: willPublish,
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

  const handleIcdConfirm = async (note: string) => {
    if (!can('handover.confirm') || !selectedHandover) return;
    setShowIcdConfirmDialog(false);
    await action.run(() =>
      icdConfirmHandover(selectedHandover.id, note || 'ICD xác nhận hoàn tất bàn giao.'),
    );
  };

  const handleDispute = async () => {
    if (!can('handover.dispute') || !selectedHandover || disputeNoteText.trim().length < 10) return;
    const reasonCode = disputeReasonCode;
    const note = disputeNoteText.trim();
    setShowDisputeModal(false);
    setDisputeNoteText('');
    await action.run(() => disputeHandover(selectedHandover.id, reasonCode, note));
  };

  const getStatusBadge = (status: HandoverStatus) => {
    const label = businessLabel('handoverStatus', status);
    const tone = businessTone('handoverStatus', status);
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold ring-1 ${TONE_CLASSES[tone]}`} title={status}>
        {label}
      </span>
    );
  };

  // ICD confirm: gather POD summary from WAREHOUSE_RECEIVED confirmation
  const podConf = selectedHandover?.confirmations.find((c) => c.confirmationType === 'WAREHOUSE_RECEIVED');
  const icdConfirmSummary = selectedHandover
    ? [
        { label: 'Container', value: `${selectedHandover.containerNumber} (${selectedHandover.containerType})` },
        { label: 'Mã vận chuyển', value: selectedHandover.transportCode },
        { label: 'Đối tác', value: selectedHandover.partnerName },
        { label: 'Kho nhận', value: selectedHandover.warehouseName },
        ...(podConf?.receiverName ? [{ label: 'Người nhận tại kho', value: `${podConf.receiverName}${podConf.receiverPhone ? ` · ${podConf.receiverPhone}` : ''}` }] : []),
        ...(podConf?.vehiclePlate ? [{ label: 'Phương tiện', value: podConf.vehiclePlate }] : []),
        ...(podConf?.latitude != null ? [{ label: 'GPS', value: `${podConf.latitude.toFixed(5)}, ${podConf.longitude?.toFixed(5) ?? '—'}${podConf.accuracyM != null ? ` (±${podConf.accuracyM}m)` : ''}` }] : []),
        { label: 'Biên bản POD', value: podConf?.proofImageUrl ? '✓ Đã đính kèm' : 'Chưa có ảnh POD' },
        { label: 'Chữ ký', value: podConf?.signatureUrl ? '✓ Đã đính kèm' : 'Chưa có chữ ký' },
      ]
    : [];

  // Stepper timestamps per step index (0-based)
  const stepTimestamps: Array<string | undefined> = selectedHandover
    ? [
        undefined,
        selectedHandover.readyAt,
        selectedHandover.partnerAcceptedAt,
        selectedHandover.departedAt,
        selectedHandover.partnerConfirmedAt,
        selectedHandover.icdConfirmedAt ?? selectedHandover.completedAt,
      ]
    : [];

  // Warehouse coordinates for GPS check
  const selectedWarehouse = warehouses.find((w) => w.id === selectedHandover?.warehouseId);

  return (
    <div className="space-y-6">
      {!showCreateModal && !showDisputeModal && !showIcdConfirmDialog && (
        <CommandNotice notice={action.notice} />
      )}

      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-indigo-600 text-white font-mono font-bold text-xs rounded">
              BÀN GIAO ĐỐI TÁC
            </span>
            <h2 className="text-lg font-bold text-slate-900">
              Bàn giao Vận chuyển Ngoài ICD
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Quản lý quy trình ủy thác container cho đối tác vận tải ngoài và nghiệm thu biên bản
            giao nhận (POD)
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

      {/* Quick filter tabs */}
      <ReadOnlyNotice writePermissions={['handover.create', 'handover.publish', 'handover.icd_confirm', 'handover.complete', 'handover.dispute']} />
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-x-auto">
        <div className="flex gap-1 p-2">
          {QUICK_TABS.map((tab) => {
            const count = tabCount(tab);
            const isActive = quickTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setQuickTabState(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
                {count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-caption font-bold ${isActive ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Filter bar */}
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
            aria-label="Lọc theo đối tác"
            value={partnerFilter}
            onChange={(e) => setPartnerFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">Tất cả đối tác</option>
            {partnerClients.map((p) => (
              <option key={p.id} value={p.id}>{p.partnerName}</option>
            ))}
          </select>

          <select
            aria-label="Lọc theo kho nhận"
            value={warehouseFilter}
            onChange={(e) => setWarehouseFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">Tất cả kho nhận</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>

        <span className="text-slate-400">
          <ConfirmedResourceValue resource="handovers">
            Hiển thị {filteredHandovers.length} lệnh bàn giao
          </ConfirmedResourceValue>
        </span>
      </div>

      {/* Layout: List + Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Handovers List */}
        <div className="space-y-3">
          <CollectionState
            resource="handovers"
            count={filteredHandovers.length}
            total={handovers.length}
            filtered={!!searchTerm || quickTab !== 'ALL' || partnerFilter !== 'ALL' || warehouseFilter !== 'ALL'}
            onClear={() => {
              setSearchTerm('');
              setQuickTabState('ALL');
              setPartnerFilter('ALL');
              setWarehouseFilter('ALL');
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
                    Kho nhận: <strong>{h.warehouseName}</strong>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Right 2 Columns: Handover Detail */}
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
                    Container:{' '}
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
                    <span>Xem hồ sơ container</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* State Machine Stepper */}
              <div>
                <div className="font-bold text-slate-700 uppercase tracking-wider text-caption mb-3">
                  Tiến trình bàn giao
                </div>
                <div className="grid grid-cols-6 gap-2 text-center">
                  {[
                    { key: 'DRAFT', label: 'Bản nháp' },
                    { key: 'READY_FOR_HANDOVER', label: 'Sẵn sàng' },
                    { key: 'PARTNER_ACCEPTED', label: 'Đã nhận' },
                    { key: 'IN_TRANSIT', label: 'Đang đi' },
                    { key: 'PARTNER_CONFIRMED', label: 'Đã giao kho' },
                    { key: 'COMPLETED', label: 'Nghiệm thu' },
                  ].map((step, idx) => {
                    const currentStepNum = getStepNumber(selectedHandover.status);
                    // For exception states, show the last normal step as passed but no current
                    const isPassed = currentStepNum !== null
                      ? idx + 1 <= currentStepNum
                      : idx + 1 <= 4; // IN_TRANSIT level for exceptions
                    const isCurrent = currentStepNum !== null && idx + 1 === currentStepNum;
                    const tsForStep = formatDt(stepTimestamps[idx]);

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
                        <div>{step.label}</div>
                        {tsForStep && (
                          <div className={`mt-0.5 font-normal text-caption truncate ${isCurrent ? 'text-indigo-200' : isPassed ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {tsForStep}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Exception state indicator */}
                {getStepNumber(selectedHandover.status) === null && (
                  <div className="mt-3 flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span className="font-bold text-rose-800">
                      {businessLabel('handoverStatus', selectedHandover.status)}
                    </span>
                    {selectedHandover.disputeReason && (
                      <span className="text-rose-700 ml-2">— {selectedHandover.disputeReason}</span>
                    )}
                  </div>
                )}
              </div>

              {/* Handover Details Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    <span>Đối tác vận tải ngoài</span>
                  </div>
                  <div>
                    Tên đối tác: <strong>{selectedHandover.partnerName}</strong>
                  </div>
                  <div>
                    Ghi chú đơn:{' '}
                    <span className="text-slate-600">{selectedHandover.notes || 'Không có'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800 flex items-center space-x-2">
                    <Warehouse className="w-4 h-4 text-blue-600" />
                    <span>Kho nhận hàng</span>
                  </div>
                  <div>
                    Tên kho: <strong>{selectedHandover.warehouseName}</strong>
                  </div>
                  <div>
                    Địa chỉ:{' '}
                    <span className="text-slate-600">{selectedHandover.warehouseAddress}</span>
                  </div>
                  <div>
                    Dự kiến đến kho:{' '}
                    <span className="text-slate-700 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {selectedHandover.expectedDeliveryAt
                        ? formatVietnamDateTime(selectedHandover.expectedDeliveryAt)
                        : 'Chưa đặt lịch'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Operational Action Bar */}
              <div className={`border p-4 rounded-xl flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                ['PARTNER_REJECTED', 'DELIVERY_FAILED', 'DISPUTED'].includes(selectedHandover.status)
                  ? 'bg-rose-50/60 border-rose-200'
                  : selectedHandover.status === 'CANCELLED'
                    ? 'bg-slate-50 border-slate-200'
                    : 'bg-indigo-50/70 border-indigo-200'
              }`}>
                <div className="flex-1">
                  <div className="font-bold text-slate-900 mb-1">Trạng thái bàn giao:</div>
                  <div className="text-slate-700 text-caption">
                    {selectedHandover.status === 'DRAFT' &&
                      'Nhấn "Sẵn sàng bàn giao" để khóa dữ liệu và cấp quyền cho đối tác qua API.'}
                    {selectedHandover.status === 'READY_FOR_HANDOVER' &&
                      'Đang chờ đối tác nhận lệnh và xác nhận qua API tích hợp.'}
                    {selectedHandover.status === 'PARTNER_ACCEPTED' &&
                      'Đối tác đã nhận lệnh, đang chuẩn bị xuất phát vận chuyển.'}
                    {selectedHandover.status === 'IN_TRANSIT' &&
                      'Container đang trên đường vận chuyển đến kho đích. Đối tác sẽ nộp biên bản POD khi đến nơi.'}
                    {selectedHandover.status === 'PARTNER_CONFIRMED' &&
                      'Đối tác báo đã giao kho thành công. ICD cần kiểm tra biên nhận POD và xác nhận nghiệm thu.'}
                    {(selectedHandover.status === 'ICD_CONFIRMED' ||
                      selectedHandover.status === 'COMPLETED') &&
                      'ICD đã xác nhận hoàn tất bàn giao. Quy trình khép kín.'}
                    {selectedHandover.status === 'PARTNER_REJECTED' && (
                      <span className="text-rose-800">
                        Đối tác từ chối nhận lệnh vận chuyển.{' '}
                        {selectedHandover.disputeNote && <span>Lý do: <strong>{selectedHandover.disputeNote}</strong>.</span>}
                        {' '}Có thể tạo lệnh bàn giao mới cho container này.
                      </span>
                    )}
                    {selectedHandover.status === 'DELIVERY_FAILED' && (
                      <span className="text-rose-800">
                        Vận chuyển thất bại.{' '}
                        {selectedHandover.disputeNote && <span>Chi tiết: <strong>{selectedHandover.disputeNote}</strong>.</span>}
                        {' '}Cần xử lý tái bàn giao hoặc lấy container về ICD.
                      </span>
                    )}
                    {selectedHandover.status === 'DISPUTED' && (
                      <span className="text-amber-800 font-semibold">
                        Đang tranh chấp — {selectedHandover.disputeReason && <span>Lý do: {selectedHandover.disputeReason}. </span>}
                        {selectedHandover.disputeNote && <span>{selectedHandover.disputeNote}</span>}
                      </span>
                    )}
                    {selectedHandover.status === 'CANCELLED' && 'Lệnh bàn giao đã bị hủy.'}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {selectedHandover.status === 'DRAFT' && (
                    <button
                      hidden={!can('handover.create')}
                      disabled={action.pending}
                      onClick={handlePublish}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs"
                    >
                      Sẵn sàng bàn giao
                    </button>
                  )}

                  {['READY_FOR_HANDOVER', 'PARTNER_ACCEPTED', 'IN_TRANSIT'].includes(
                    selectedHandover.status,
                  ) && (
                    <p className="text-sm text-indigo-700">
                      Đang chờ cập nhật từ đối tác. Nhấn tải lại để cập nhật tiến trình.
                    </p>
                  )}

                  {selectedHandover.status === 'PARTNER_CONFIRMED' && (
                    <>
                      <button
                        hidden={!can('handover.confirm')}
                        disabled={action.pending}
                        onClick={() => setShowIcdConfirmDialog(true)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-xs flex items-center space-x-2"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Duyệt nghiệm thu (Biên bản POD)</span>
                      </button>
                      <button
                        hidden={!can('handover.dispute')}
                        disabled={action.pending}
                        onClick={() => setShowDisputeModal(true)}
                        className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shadow-xs flex items-center space-x-2"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Tạo tranh chấp</span>
                      </button>
                    </>
                  )}

                  {(selectedHandover.status === 'ICD_CONFIRMED' ||
                    selectedHandover.status === 'COMPLETED') && (
                    <span className="px-3 py-2 bg-emerald-100 text-emerald-800 font-bold rounded-lg flex items-center space-x-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Đã hoàn tất</span>
                    </span>
                  )}

                  {['PARTNER_REJECTED', 'DELIVERY_FAILED'].includes(selectedHandover.status) && (
                    <button
                      hidden={!can('handover.create')}
                      disabled={action.pending}
                      onClick={() => setShowCreateModal(true)}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-xs flex items-center space-x-2"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo bàn giao thay thế</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Confirmations & Milestones History */}
              <div className="space-y-3">
                <div className="font-bold text-slate-800 flex items-center space-x-2 border-b border-slate-200 pb-1">
                  <FileCheck className="w-4 h-4 text-indigo-600" />
                  <span>Lịch sử xác nhận bàn giao</span>
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
                      <ConfirmationDetail
                        key={conf.id}
                        conf={conf}
                        warehouseLat={selectedWarehouse?.latitude}
                        warehouseLon={selectedWarehouse?.longitude}
                      />
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
              Chọn một lệnh bàn giao bên trái để xem chi tiết
            </div>
          )}
        </div>
      </div>

      {/* ICD Confirm Dialog */}
      {showIcdConfirmDialog && selectedHandover && (
        <ConfirmDialog
          title={`Duyệt nghiệm thu bàn giao — ${selectedHandover.transportCode}`}
          message="Hành động này xác nhận ICD đã kiểm tra và chấp nhận biên bản POD. Không thể hoàn tác."
          summary={icdConfirmSummary}
          reason={{
            label: 'Ghi chú nghiệm thu (tùy chọn)',
            placeholder: 'Nhập ghi chú hoặc để trống...',
            minLength: 0,
          }}
          confirmLabel="Xác nhận nghiệm thu"
          tone="primary"
          pending={action.pending}
          notice={action.notice}
          onConfirm={(note) => void handleIcdConfirm(note)}
          onClose={() => setShowIcdConfirmDialog(false)}
        />
      )}

      {/* Dispute Modal */}
      {showDisputeModal && selectedHandover && (
        <ModalOverlay
          aria-labelledby="handover-dispute-dialog-title"
          pending={action.pending}
          onClose={() => { if (!action.isPending()) setShowDisputeModal(false); }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs space-y-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 id="handover-dispute-dialog-title" className="text-base font-bold text-slate-900">
                  Tạo tranh chấp — {selectedHandover.transportCode}
                </h3>
                <p className="text-slate-600 mt-1">
                  Điền lý do tranh chấp và ghi chú mô tả chi tiết sai lệch phát hiện trong POD.
                </p>
              </div>
            </div>

            <CommandNotice notice={action.notice} />

            <div>
              <label htmlFor="dispute-reason-code" className="block font-semibold text-slate-700 mb-1">
                Lý do tranh chấp*
              </label>
              <select
                id="dispute-reason-code"
                value={disputeReasonCode}
                onChange={(e) => setDisputeReasonCode(e.target.value)}
                disabled={action.pending}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
              >
                {DISPUTE_REASONS.map((r) => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dispute-note-text" className="block font-semibold text-slate-700 mb-1">
                Mô tả chi tiết tranh chấp* (tối thiểu 10 ký tự)
              </label>
              <textarea
                id="dispute-note-text"
                rows={4}
                required
                minLength={10}
                value={disputeNoteText}
                onChange={(e) => setDisputeNoteText(e.target.value)}
                disabled={action.pending}
                placeholder="Mô tả cụ thể sai lệch: sai số container, địa chỉ kho sai, GPS không khớp, ảnh POD mờ..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
              {disputeNoteText.trim().length > 0 && disputeNoteText.trim().length < 10 && (
                <p className="mt-1 text-caption text-rose-600">Vui lòng nhập tối thiểu 10 ký tự.</p>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                disabled={action.pending}
                onClick={() => setShowDisputeModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={action.pending || disputeNoteText.trim().length < 10}
                onClick={() => void handleDispute()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg disabled:opacity-60"
              >
                {action.pending ? 'Đang xử lý…' : 'Gửi tranh chấp'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

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
              Khởi tạo hồ sơ ủy thác container ra ngoài ICD cho đối tác vận tải chuyển đến kho nhận đích.
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
                    Container cần bàn giao* {' '}
                    <span className="font-normal text-slate-500">(chỉ container đã ra cổng)</span>
                  </label>
                  <select
                    required
                    {...validation.props('handovers-selected-cont-visit-id')}
                    id="handovers-selected-cont-visit-id"
                    value={selectedContVisitId}
                    onChange={(e) => setSelectedContVisitId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                  >
                    <option value="">Chọn container đã ra cổng</option>
                    {sortedContainerVisits.map((c) => {
                      const stateVi = CONTAINER_STATE_VI[c.state] ?? c.state;
                      const openCode = openHandoverByVisit.get(c.id);
                      const blocked = c.state !== 'EXITED' || Boolean(openCode);
                      return (
                        <option key={c.id} value={c.id} disabled={blocked && c.id !== selectedContVisitId}>
                          {c.containerNumber} — {openCode ? `Đã có lệnh ${openCode}` : stateVi}
                        </option>
                      );
                    })}
                  </select>
                  {selectedHandoverBlock && (
                    <p role="alert" className="mt-1 text-caption text-rose-700">
                      {selectedHandoverBlock}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="handovers-selected-partner-client-id"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Đối tác vận tải*
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
                        <option key={p.id} value={p.id} disabled={p.status !== 'ACTIVE'}>
                          {p.partnerName} ({p.partnerCode}){p.status !== 'ACTIVE' ? ' — Đã thu hồi' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="handovers-selected-warehouse-id"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Kho nhận đích*
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

                <div>
                  <label
                    htmlFor="handovers-expected-delivery"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Dự kiến đến kho
                  </label>
                  <input
                    id="handovers-expected-delivery"
                    type="datetime-local"
                    value={expectedDeliveryAtInput}
                    onChange={(e) => setExpectedDeliveryAtInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  />
                </div>

              </fieldset>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
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
                  disabled={action.pending || Boolean(selectedHandoverBlock)}
                  onClick={() => { publishNowRef.current = false; }}
                  className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-bold rounded-lg"
                >
                  Lưu nháp
                </button>
                <button
                  type="submit"
                  disabled={action.pending || Boolean(selectedHandoverBlock)}
                  onClick={() => { publishNowRef.current = true; }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg"
                >
                  Sẵn sàng bàn giao
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
