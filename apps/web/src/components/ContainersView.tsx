import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ContainerVisit, ContainerState, HoldType } from '../types';
import {
  Boxes,
  Search,
  Warehouse,
  Receipt,
  ShieldAlert,
  Send,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { NavTabId } from './Sidebar';
import { NavigationContext } from '../navigation';
import { useBackendReadiness } from './useBackendReadiness';
import { CriticalDataNotice } from './CriticalDataNotice';

import { useCommandAction, CommandNotice } from './useCommandAction';
import { ConfirmDialog } from './ConfirmDialog';
import { StatusBadge } from './StatusBadge';
import { businessLabel } from '../lib/business-labels';
import { vietnamBusinessDateToIso, formatVietnamDate, formatVietnamDateTime } from '../lib/time';

import QRCode from 'react-qr-code';
import { effectiveGatePassStatus } from '../lib/gate-pass';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState, ConfirmedResourceValue } from './CollectionState';
import { ReadinessNotice } from './ReadinessNotice';
import { useGatePassExpiry } from './useGatePassExpiry';
import { hasWebPermission } from '../services/permissions';
import { ReadOnlyNotice } from './ReadOnlyNotice';

interface ContainersViewProps {
  onNavigate: (tab: NavTabId, contextId?: string, context?: NavigationContext) => void;
  selectedVisitId?: string;
}

export const ContainersView: React.FC<ContainersViewProps> = ({ onNavigate, selectedVisitId }) => {
  const {
    currentUser,
    containerVisits,
    manifests,
    consignees,
    holds,
    visitSafetyStatus = {},
    invoices,
    gatePasses,
    handovers,
    createOperationalHold,
    releaseOperationalHold,
    createGatePass,
    createContainerVisit,
    cancelContainerVisit,
    updateContainerVisit,
    createMovementOrder,
    movementOrders,
    resourceStatus = {},
    isLoading,
    detailStatus,
  } = useApp();
  const can = (permission: string) => hasWebPermission(currentUser, permission);
  const collectionState = (resource: string) => resourceStatus[resource] ?? (isLoading ? 'loading' : 'ready');
  const invoiceState = collectionState('invoices');
  const movementOrderState = collectionState('movementOrders');
  const handoverState = collectionState('handovers');
  const readable = (state: string) => state === 'ready' || state === 'stale';
  const yardLocationStates = ['containerVisits', 'yardSlots'].map(
    (resource) => resourceStatus[resource] ?? (isLoading ? 'loading' : 'ready'),
  );
  const yardLocationReady = yardLocationStates.every((state) => state === 'ready');
  const yardLocationForbidden = yardLocationStates.includes('forbidden');
  const yardLocationLabel = (visit: ContainerVisit, emptyLabel = 'Chưa xếp') => {
    if (yardLocationReady) return visit.currentLocation || emptyLabel;
    if (!yardLocationForbidden && visit.currentLocation)
      return `${visit.currentLocation} (dữ liệu đã tải)`;
    return yardLocationStates.includes('loading')
      ? 'Đang xác minh vị trí bãi…'
      : 'Chưa xác nhận vị trí bãi';
  };

  const action = useCommandAction();
  const validation = useFormValidation();
  const now = useGatePassExpiry(gatePasses);
  const [showCreateVisit, setShowCreateVisit] = useState(false);
  const [cvForm, setCvForm] = useState({
    containerNumber: '',
    containerType: '40HC' as ContainerVisit['containerType'],
    consigneeName: '',
    shippingLine: '',
    manifestNo: '',
    mblNumber: '',
    hblNumber: '',
    manifestSeal: '',
    grossWeightKg: 0,
  });

  const [searchTerm, setSearchTerm] = useViewQueryState('containers', 'search', '');
  const formManifest = manifests.find((m) => m.manifestNo === cvForm.manifestNo);
  const formMaster = formManifest?.masterBills.find((m) => m.mblNumber === cvForm.mblNumber);
  const [stateFilter, setStateFilter] = useViewQueryState('containers', 'state', 'ALL');
  const [hasBlockerOnly, setHasBlockerOnly] = useState(false);
  const [manifestFilter, setManifestFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Confirm dialogs (replace window.prompt/confirm)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [releaseHoldTarget, setReleaseHoldTarget] = useState<string | null>(null);

  // Notes edit
  const [notesText, setNotesText] = useState('');
  const [showNotesEdit, setShowNotesEdit] = useState(false);

  // Timeline filter
  const [timelineFilter, setTimelineFilter] = useState<'ALL' | 'LOCATION' | 'FINANCE' | 'HOLDS' | 'GATE'>('ALL');

  // Selected container modal
  const [activeModalVisitId, setActiveModalVisitId] = useState<string | null>(
    selectedVisitId || null,
  );
  const [activeDetailTab, setActiveDetailTab] = useState<
    'OVERVIEW' | 'YARD_OPS' | 'BILLING' | 'GATE_PASS' | 'TIMELINE' | 'HOLDS'
  >('OVERVIEW');

  // New Hold Form
  const [showAddHold, setShowAddHold] = useState(false);
  const [newHoldType, setNewHoldType] = useState<HoldType>('CUSTOMS');
  const [newHoldReason, setNewHoldReason] = useState('');

  // Gate Pass Form in modal
  const [gpPlate, setGpPlate] = useState('');
  const [gpReceiver, setGpReceiver] = useState('');
  const [gpCccd, setGpCccd] = useState('');
  const closeDetail = () => {
    if (!action.isPending()) setActiveModalVisitId(null);
  };

  useEffect(() => {
    if (selectedVisitId) {
      setActiveModalVisitId(selectedVisitId);
      setActiveDetailTab('OVERVIEW');
    }
  }, [selectedVisitId]);

  // Reset notes editor state when switching between containers (fix stale draft text bug)
  useEffect(() => {
    setShowNotesEdit(false);
    setNotesText('');
  }, [activeModalVisitId]);

  const filteredVisits = containerVisits.filter((v) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNo = v.containerNumber.toLowerCase().includes(q);
      const matchCsg = v.consigneeName.toLowerCase().includes(q);
      const matchMnf = v.manifestNo.toLowerCase().includes(q);
      const matchMbl = (v.mblNumber ?? '').toLowerCase().includes(q);
      const matchHbl = (v.hblNumber ?? '').toLowerCase().includes(q);
      if (!matchNo && !matchCsg && !matchMnf && !matchMbl && !matchHbl) return false;
    }

    if (stateFilter !== 'ALL' && v.state !== stateFilter) return false;

    if (manifestFilter && v.manifestNo !== manifestFilter) return false;

    // Business dates are Vietnam calendar days (UTC+7), independent of the browser time zone.
    if (dateFrom && v.gateInAt) {
      const fromIso = vietnamBusinessDateToIso(dateFrom);
      if (fromIso && new Date(v.gateInAt).getTime() < new Date(fromIso).getTime()) return false;
    }
    if (dateTo && v.gateInAt) {
      const toIso = vietnamBusinessDateToIso(dateTo);
      if (toIso && new Date(v.gateInAt).getTime() >= new Date(toIso).getTime() + 24 * 60 * 60 * 1000) return false;
    }

    if (hasBlockerOnly) {
      const activeHolds = holds.filter((h) => h.containerVisitId === v.id && h.status === 'ACTIVE');
      const invs = invoices.filter((i) => i.containerVisitId === v.id && i.status !== 'PAID');
      if (
        visitSafetyStatus[v.id]?.holds === 'ready' &&
        invoiceState === 'ready' &&
        yardLocationReady &&
        activeHolds.length === 0 &&
        invs.length === 0 &&
        v.currentLocation
      )
        return false;
    }

    return true;
  });

  const activeVisit = containerVisits.find((v) => v.id === activeModalVisitId);
  const activeVisitHolds = activeVisit
    ? holds.filter((h) => h.containerVisitId === activeVisit.id)
    : [];
  const activeVisitInvoices = activeVisit
    ? invoices.filter((i) => i.containerVisitId === activeVisit.id)
    : [];
  const activeVisitGatePass = activeVisit
    ? gatePasses.find(
        (gp) =>
          gp.containerVisitId === activeVisit.id && effectiveGatePassStatus(gp, now) === 'ACTIVE',
      )
    : null;
  const activeVisitHandover = activeVisit
    ? handovers.find((h) => h.containerVisitId === activeVisit.id)
    : null;
  const holdsReady = activeVisit && visitSafetyStatus[activeVisit.id]?.holds === 'ready';
  const passesReady = activeVisit && visitSafetyStatus[activeVisit.id]?.gatePasses === 'ready';

  const evaluation = useBackendReadiness(activeVisit?.id);
  const { readiness, readinessError, isCheckingReadiness } = evaluation;

  const issueInlinePass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !activeVisit ||
      !can('gate_pass.create') ||
      action.isPending() ||
      evaluation.status !== 'ready' ||
      !validation.validate(e.currentTarget)
    )
      return;
    await action.run(() =>
      createGatePass({
        visitId: activeVisit.id,
        vehiclePlate: gpPlate,
        receiverName: gpReceiver,
        receiverIdNumber: gpCccd,
      }),
    );
  };
  const saveContainerVisit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!can('container.create') || action.isPending() || !validation.validate(e.currentTarget))
      return;
    const result = await action.run(() => createContainerVisit(cvForm));
    if (result?.success) {
      setShowCreateVisit(false);
      setCvForm({
        containerNumber: '',
        containerType: '40HC',
        consigneeName: '',
        shippingLine: '',
        manifestNo: '',
        mblNumber: '',
        hblNumber: '',
        manifestSeal: '',
        grossWeightKg: 0,
      });
    }
  };

  /** Vietnamese state badge — raw code stays in tooltip for support staff. */
  const getStateBadge = (state: ContainerState) => (
    <StatusBadge domain="containerVisitStatus" value={state} />
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Boxes className="w-5 h-5 text-blue-600" />
            <span>Container 360 · Danh sách & vòng đời</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi trạng thái vòng đời, vị trí bãi Yard, thời gian lưu bãi (Dwell days), Holds và
            kiểm tra điều kiện ra cổng (Readiness)
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="px-3 py-1 bg-slate-100 rounded-lg text-slate-700 font-semibold">
            <ConfirmedResourceValue resource="containerVisits">
              Tổng cộng: {containerVisits.length} containers
            </ConfirmedResourceValue>
          </span>
          <button
            hidden={!can('container.create')}
            onClick={() => setShowCreateVisit(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tiếp nhận Container Mới</span>
          </button>
        </div>
      </div>

      <ReadOnlyNotice
        writePermissions={[
          'container.create',
          'container.update',
          'container.cancel',
          'movement_order.create',
          'gate_pass.create',
          'operational_hold.manage',
          'yard.update',
          'billing.manage',
        ]}
      />

      {!activeVisit && !showCreateVisit && <CommandNotice notice={action.notice} />}

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Số cont, MBL, HBL, chủ hàng, manifest..."
              aria-label="Tìm container"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 bg-slate-50"
            />
          </div>

          <select
            aria-label="Lọc trạng thái container"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ cấp lệnh</option>
            <option value="AUTHORIZED">Chờ vào cổng</option>
            <option value="IN_YARD">Trong bãi</option>
            <option value="UNDER_INSPECTION">Đang kiểm hóa</option>
            <option value="IN_STRIPPING">Đang rút hàng</option>
            <option value="STRIPPED">Đã rút hàng xong</option>
            <option value="GATE_PASS_ISSUED">Đã cấp phiếu ra cổng</option>
            <option value="EXITED">Đã ra cổng</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>

          <select
            aria-label="Lọc theo Manifest"
            value={manifestFilter}
            onChange={(e) => setManifestFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="">Tất cả Manifest</option>
            {manifests
              .filter((m) => m.status !== 'CANCELLED')
              .map((m) => (
                <option key={m.id} value={m.manifestNo}>{m.manifestNo}</option>
              ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-slate-600 font-medium">Vào cổng từ:</label>
          <input
            type="date"
            aria-label="Từ ngày vào cổng"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700"
          />
          <label className="text-slate-600 font-medium">đến:</label>
          <input
            type="date"
            aria-label="Đến ngày vào cổng"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700"
          />
          <label className="flex items-center space-x-2 cursor-pointer text-slate-700 select-none">
            <input
              type="checkbox"
              checked={hasBlockerOnly}
              onChange={(e) => setHasBlockerOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Chỉ container có vướng mắc (lệnh giữ / chưa thanh toán / chưa có vị trí)</span>
          </label>
          <span className="ml-auto text-slate-400"><ConfirmedResourceValue resource="containerVisits">Hiển thị {filteredVisits.length} containers</ConfirmedResourceValue></span>
        </div>
      </div>

      <CollectionState
        resource="containerVisits"
        count={filteredVisits.length}
        total={containerVisits.length}
        filtered={!!searchTerm || stateFilter !== 'ALL' || hasBlockerOnly}
        onClear={() => {
          setSearchTerm('');
          setStateFilter('ALL');
          setHasBlockerOnly(false);
          setManifestFilter('');
          setDateFrom('');
          setDateTo('');
        }}
      />
      {/* Container Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
              <tr>
                <th className="py-3 px-4">Số Container</th>
                <th className="py-3 px-4">Loại</th>
                <th className="py-3 px-4">Chủ hàng</th>
                <th className="py-3 px-4 hidden sm:table-cell">Manifest</th>
                <th className="py-3 px-4">Vị trí Bãi</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Vào cổng</th>
                <th className="py-3 px-4">Ngày lưu</th>
                <th className="py-3 px-4">Vướng mắc</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVisits.map((v) => {
                const activeHoldsCount = holds.filter(
                  (h) => h.containerVisitId === v.id && h.status === 'ACTIVE',
                ).length;
                const hasUnpaid = readable(invoiceState) && invoices.some(
                  (i) => i.containerVisitId === v.id && i.status !== 'PAID',
                );
                const dwellDays = v.gateInAt
                  ? Math.floor((Date.now() - new Date(v.gateInAt).getTime()) / (24 * 3600 * 1000))
                  : 0;
                const isOverFree = v.freeDays !== undefined && dwellDays > v.freeDays;

                return (
                  <tr key={v.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {v.containerNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">
                      <StatusBadge domain="containerType" value={v.containerType} />
                    </td>
                    <td className="py-3 px-4 text-slate-800 max-w-[180px] truncate">
                      {v.consigneeName}
                    </td>
                    <td className="py-3 px-4 hidden sm:table-cell text-slate-600 font-mono text-caption">
                      {v.manifestNo || '—'}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {v.currentLocation && !yardLocationForbidden ? (
                        <span className="px-2 py-1 bg-blue-50 text-blue-800 rounded border border-blue-200">
                          {yardLocationLabel(v)}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">{yardLocationLabel(v)}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStateBadge(v.state)}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {v.gateInAt ? formatVietnamDate(v.gateInAt) : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {v.gateInAt ? (
                        <span
                          className={`font-semibold ${isOverFree ? 'text-rose-600' : 'text-slate-700'}`}
                        >
                          {dwellDays} ngày{' '}
                          {isOverFree && (
                            <span className="text-caption text-rose-500">(quá hạn)</span>
                          )}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {visitSafetyStatus[v.id]?.holds !== 'ready' && (
                          <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-caption">
                            Chưa xác minh
                          </span>
                        )}
                        {visitSafetyStatus[v.id]?.holds === 'ready' && activeHoldsCount > 0 && (
                          <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 border border-rose-200 rounded text-caption flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3" /> Lệnh giữ
                          </span>
                        )}
                        {hasUnpaid && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 border border-orange-200 rounded text-caption flex items-center gap-1">
                            <Receipt className="w-3 h-3" /> Chưa TT
                          </span>
                        )}
                        {yardLocationReady && !v.currentLocation && v.state === 'IN_YARD' && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded text-caption flex items-center gap-1">
                            <Warehouse className="w-3 h-3" /> Chưa vị trí
                          </span>
                        )}
                        {visitSafetyStatus[v.id]?.holds === 'ready' &&
                          activeHoldsCount === 0 &&
                          !hasUnpaid &&
                          yardLocationReady &&
                          v.currentLocation && (
                            <span className="text-emerald-600 text-caption font-semibold">✓ Sẵn sàng</span>
                          )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setActiveModalVisitId(v.id);
                          setActiveDetailTab('OVERVIEW');
                        }}
                        className="px-3 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded transition"
                      >
                        Chi tiết →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comprehensive Container Detail Modal (6 Tabs) */}
      {activeVisit && (
        <ModalOverlay
          aria-label={`Container 360 ${activeVisit.containerNumber}`}
          pending={action.pending}
          onClose={closeDetail}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto"
        >
          <div className="bg-white rounded-2xl max-w-5xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-200">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 className="text-xl font-bold font-mono text-slate-900">
                    {activeVisit.containerNumber}
                  </h3>
                  {getStateBadge(activeVisit.state)}
                  <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-700 rounded-md">
                    {activeVisit.containerType}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Chủ hàng: <strong className="text-slate-800">{activeVisit.consigneeName}</strong>{' '}
                  · Hãng tàu: <strong>{activeVisit.shippingLine}</strong> · Manifest:{' '}
                  <strong>{activeVisit.manifestNo}</strong>
                </p>
              </div>
              <button
                disabled={action.pending}
                onClick={closeDetail}
                aria-label="Đóng chi tiết container"
                className="w-8 h-8 shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 border-b border-slate-200 mt-4 overflow-x-auto text-xs shrink-0 [&>button]:shrink-0 [&>button]:whitespace-nowrap">
              <button
                disabled={action.pending}
                onClick={() => setActiveDetailTab('OVERVIEW')}
                aria-pressed={activeDetailTab === 'OVERVIEW'}
                className={`px-4 py-2 font-bold border-b-2 transition ${
                  activeDetailTab === 'OVERVIEW'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Tổng quan & Điều kiện
              </button>
              <button
                disabled={action.pending}
                onClick={() => setActiveDetailTab('YARD_OPS')}
                aria-pressed={activeDetailTab === 'YARD_OPS'}
                className={`px-4 py-2 font-bold border-b-2 transition ${
                  activeDetailTab === 'YARD_OPS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Tác nghiệp bãi
              </button>
              <button
                disabled={action.pending}
                onClick={() => setActiveDetailTab('BILLING')}
                aria-pressed={activeDetailTab === 'BILLING'}
                className={`px-4 py-2 font-bold border-b-2 transition ${
                  activeDetailTab === 'BILLING'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Dịch vụ & Thanh toán (<ConfirmedResourceValue resource="invoices">{activeVisitInvoices.length}</ConfirmedResourceValue>)
              </button>
              <button
                disabled={action.pending}
                onClick={() => setActiveDetailTab('GATE_PASS')}
                aria-pressed={activeDetailTab === 'GATE_PASS'}
                className={`px-4 py-2 font-bold border-b-2 transition ${
                  activeDetailTab === 'GATE_PASS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Phiếu ra cổng
              </button>
              <button
                disabled={action.pending}
                onClick={() => setActiveDetailTab('HOLDS')}
                aria-pressed={activeDetailTab === 'HOLDS'}
                className={`px-4 py-2 font-bold border-b-2 transition ${
                  activeDetailTab === 'HOLDS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Lệnh giữ (
                {holdsReady ? activeVisitHolds.filter((h) => h.status === 'ACTIVE').length : '?'})
              </button>
              <button
                disabled={action.pending}
                onClick={() => setActiveDetailTab('TIMELINE')}
                aria-pressed={activeDetailTab === 'TIMELINE'}
                className={`px-4 py-2 font-bold border-b-2 transition ${
                  activeDetailTab === 'TIMELINE'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Dòng thời gian
              </button>
            </div>

            <CommandNotice notice={action.notice} />
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto py-5 space-y-5 text-xs">
              {/* TAB 1: OVERVIEW */}
              {activeDetailTab === 'OVERVIEW' && (
                <div className="space-y-5">
                  {/* Next Step Banner (CONT-06) */}
                  {(() => {
                    const hasMO = readable(movementOrderState) && movementOrders.some(
                      (o) => o.containerVisitId === activeVisit.id && o.status !== 'CANCELLED',
                    );
                    const hasUnpaidInvoice = readable(invoiceState) && activeVisitInvoices.some(
                      (i) => i.status !== 'PAID' && i.status !== 'VOID',
                    );
                    const hasHandover = readable(handoverState) && !!activeVisitHandover;
                    if (activeVisit.state === 'PENDING' && !hasMO) {
                      return (
                        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                          <ChevronRight className="w-5 h-5 text-blue-600 shrink-0" />
                          <span className="font-semibold text-blue-900">Bước tiếp theo: Tạo lệnh vào ICD</span>
                          <button
                            hidden={!can('movement_order.create')}
                            disabled={action.pending}
                            onClick={() => void action.run(() => createMovementOrder(activeVisit.id))}
                            className="ml-auto px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shrink-0"
                          >
                            + Tạo lệnh vào ICD (Movement Order)
                          </button>
                        </div>
                      );
                    }
                    if (activeVisit.state === 'AUTHORIZED') {
                      return (
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                          <ChevronRight className="w-5 h-5 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-indigo-900">Bước tiếp theo: Chờ xe vào cổng — xem lệnh vào ICD</span>
                          <button
                            disabled={action.pending}
                            onClick={() => { setActiveModalVisitId(null); onNavigate('movement-orders' as NavTabId, activeVisit.id); }}
                            className="ml-auto px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shrink-0"
                          >
                            Xem lệnh vào ICD →
                          </button>
                        </div>
                      );
                    }
                    if (activeVisit.state === 'IN_YARD' && !activeVisit.currentLocation) {
                      return (
                        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                          <ChevronRight className="w-5 h-5 text-amber-600 shrink-0" />
                          <span className="font-semibold text-amber-900">Bước tiếp theo: Chỉ định vị trí bãi</span>
                          <button
                            disabled={action.pending}
                            hidden={!can('yard.update')}
                            onClick={() => { setActiveModalVisitId(null); onNavigate('yard', activeVisit.id); }}
                            className="ml-auto px-3 py-1.5 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 shrink-0"
                          >
                            Đến Tác nghiệp bãi →
                          </button>
                        </div>
                      );
                    }
                    if (activeVisit.state === 'IN_YARD' && hasUnpaidInvoice) {
                      return (
                        <div className="flex items-center gap-3 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                          <ChevronRight className="w-5 h-5 text-orange-600 shrink-0" />
                          <span className="font-semibold text-orange-900">Bước tiếp theo: Lập hóa đơn / thu phí dịch vụ</span>
                          <button
                            disabled={action.pending}
                            hidden={!can('billing.manage')}
                            onClick={() => { setActiveModalVisitId(null); onNavigate('billing', activeVisit.id); }}
                            className="ml-auto px-3 py-1.5 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 shrink-0"
                          >
                            Đến Dịch vụ & Thanh toán →
                          </button>
                        </div>
                      );
                    }
                    const activeHoldCount = activeVisitHolds.filter((h) => h.status === 'ACTIVE').length;
                    if (activeVisit.state === 'IN_YARD' && activeHoldCount > 0) {
                      return (
                        <div className="flex items-center gap-3 p-3 bg-rose-50 border border-rose-200 rounded-xl">
                          <ChevronRight className="w-5 h-5 text-rose-600 shrink-0" />
                          <span className="font-semibold text-rose-900">
                            Bước tiếp theo: Xử lý {activeHoldCount} lệnh giữ đang hiệu lực trước khi cấp phiếu ra cổng
                          </span>
                          <button
                            disabled={action.pending}
                            onClick={() => setActiveDetailTab('HOLDS')}
                            className="ml-auto px-3 py-1.5 bg-rose-600 text-white rounded-lg font-bold hover:bg-rose-700 shrink-0"
                          >
                            Xem lệnh giữ →
                          </button>
                        </div>
                      );
                    }
                    if (activeVisit.state === 'IN_YARD') {
                      return (
                        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                          <ChevronRight className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-emerald-900">Bước tiếp theo: Cấp phiếu ra cổng</span>
                          <button
                            disabled={action.pending}
                            onClick={() => setActiveDetailTab('GATE_PASS')}
                            className="ml-auto px-3 py-1.5 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700 shrink-0"
                          >
                            Đến tab Phiếu ra cổng →
                          </button>
                        </div>
                      );
                    }
                    if (activeVisit.state === 'GATE_PASS_ISSUED') {
                      return (
                        <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                          <ChevronRight className="w-5 h-5 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-indigo-900">Chờ xe ra cổng — phiếu ra cổng đang hiệu lực</span>
                        </div>
                      );
                    }
                    if (activeVisit.state === 'EXITED' && !hasHandover) {
                      return (
                        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                          <ChevronRight className="w-5 h-5 text-slate-500 shrink-0" />
                          <span className="font-semibold text-slate-700">Hoàn tất — xem xét tạo lệnh bàn giao vận chuyển</span>
                          <button
                            disabled={action.pending}
                            hidden={!can('handover.create')}
                            onClick={() => { setActiveModalVisitId(null); onNavigate('handovers', undefined, { visitId: activeVisit.id }); }}
                            className="ml-auto px-3 py-1.5 bg-slate-600 text-white rounded-lg font-bold hover:bg-slate-700 shrink-0"
                          >
                            Tạo lệnh bàn giao →
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Readiness Checklist Card (uses ReadinessNotice with resolveBlocker) */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-3">
                      Điều kiện cấp phiếu ra cổng
                    </h4>
                    <ReadinessNotice
                      evaluation={evaluation}
                      resolveBlocker={(code) => {
                        if (['NO_YARD_POSITION', 'ACTIVE_YARD_OPERATION', 'INSPECTION_HOLD'].includes(code)) {
                          return { label: 'Đến Tác nghiệp bãi', onClick: () => setActiveDetailTab('YARD_OPS') };
                        }
                        if (['NO_BILLING', 'BILLING_INCOMPLETE', 'UNBILLED_SERVICES', 'BILLING_CONFIGURATION_MISSING'].includes(code)) {
                          return { label: 'Đến Dịch vụ & Thanh toán', onClick: () => { setActiveModalVisitId(null); onNavigate('billing', activeVisit.id); } };
                        }
                        if (code === 'OPERATIONAL_HOLD') {
                          return { label: 'Xem lệnh giữ', onClick: () => setActiveDetailTab('HOLDS') };
                        }
                        return null;
                      }}
                    />
                  </div>

                  {/* Movement Order & Visit Actions */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                      <span>Lệnh vào ICD (Movement Order)</span>
                      {(() => {
                        const mo = movementOrders.find(
                          (o) => o.containerVisitId === activeVisit.id && o.status !== 'CANCELLED',
                        );
                        return readable(movementOrderState) && mo ? (
                          <span className="flex items-center gap-2 text-caption">
                            <span className="font-mono text-slate-700">{mo.orderCode}</span>
                            <StatusBadge domain="movementOrderStatus" value={mo.status} />
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-caption">
                            {movementOrderState === 'ready' ? 'Chưa có lệnh vào ICD' : 'Chưa xác nhận lệnh vào ICD'}
                          </span>
                        );
                      })()}
                    </h4>
                    {movementOrderState !== 'ready' && <CollectionState resource="movementOrders" count={movementOrders.length} />}
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {movementOrderState === 'ready' && !movementOrders.some(
                        (o) => o.containerVisitId === activeVisit.id && o.status !== 'CANCELLED',
                      ) &&
                        activeVisit.state === 'PENDING' && (
                          <button
                            hidden={!can('movement_order.create')}
                            disabled={action.pending}
                            onClick={() =>
                              void action.run(() => createMovementOrder(activeVisit.id))
                            }
                            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                          >
                            + Tạo lệnh vào ICD
                          </button>
                        )}
                      {['PENDING', 'AUTHORIZED'].includes(activeVisit.state) && (
                        <button
                          hidden={!can('container.cancel')}
                          disabled={action.pending}
                          onClick={() => setShowCancelConfirm(true)}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold border border-rose-200"
                        >
                          Hủy hồ sơ container
                        </button>
                      )}
                      <button
                        disabled={action.pending}
                        onClick={() => {
                          setActiveModalVisitId(null);
                          onNavigate('movement-orders' as NavTabId, activeVisit.id);
                        }}
                        className="px-3 py-2 text-blue-600 font-bold hover:underline"
                      >
                        Xem tất cả lệnh vào ICD →
                      </button>
                    </div>
                  </div>

                  {/* Transport Handover Card */}
                  <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Send className="w-4 h-4 text-indigo-700" />
                        <span className="font-bold text-indigo-950">
                          Bàn giao vận chuyển ngoài ICD
                        </span>
                      </div>
                      {readable(handoverState) && activeVisitHandover ? (
                        <StatusBadge domain="handoverStatus" value={activeVisitHandover.status} />
                      ) : (
                        <span className="text-slate-400 italic">{handoverState === 'ready' ? 'Chưa tạo lệnh bàn giao' : 'Chưa xác nhận hồ sơ bàn giao'}</span>
                      )}
                    </div>

                    {handoverState !== 'ready' && <CollectionState resource="handovers" count={handovers.length} />}
                    {readable(handoverState) && activeVisitHandover ? (
                      <div className="bg-white p-3 rounded-lg border border-indigo-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-slate-500">Mã vận chuyển:</span>{' '}
                            <strong className="font-mono text-indigo-700">
                              {activeVisitHandover.transportCode}
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-500">Đối tác:</span>{' '}
                            <strong className="text-slate-800">
                              {activeVisitHandover.partnerName}
                            </strong>
                          </div>
                        </div>
                        <div className="text-slate-600">
                          Kho nhận đích: <strong>{activeVisitHandover.warehouseName}</strong> (
                          {activeVisitHandover.warehouseAddress})
                        </div>
                        <div className="flex items-center justify-between text-caption text-slate-500 pt-1 border-t border-slate-100">
                          <span>Số mốc xác nhận: {detailStatus?.handovers?.[activeVisitHandover.id] && detailStatus.handovers[activeVisitHandover.id] !== 'ready' ? 'Chưa xác nhận' : activeVisitHandover.confirmations.length}</span>
                          <button
                            disabled={action.pending}
                            onClick={() => {
                              setActiveModalVisitId(null);
                              onNavigate('handovers', activeVisitHandover.id);
                            }}
                            className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
                          >
                            <span>Xem tiến độ bàn giao & duyệt biên bản</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </button>
                        </div>
                      </div>
                    ) : handoverState === 'ready' ? (
                      <div className="text-slate-500 flex items-center justify-between">
                        <span>
                          {activeVisit.state === 'EXITED'
                            ? 'Container đã ra cổng, sẵn sàng tạo lệnh bàn giao cho đối tác vận chuyển.'
                            : 'Container chưa ra cổng. Có thể lập trước bản nháp lệnh bàn giao.'}
                        </span>
                        <button
                          hidden={!can('handover.create')}
                          disabled={action.pending}
                          onClick={() => {
                            setActiveModalVisitId(null);
                            onNavigate('handovers', undefined, { visitId: activeVisit.id });
                          }}
                          className="ml-4 px-3 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shrink-0"
                        >
                          + Tạo lệnh bàn giao
                        </button>
                      </div>
                    ) : null}
                  </div>

                  {/* Ghi chú nội bộ (CONT-14) */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800">Ghi chú nội bộ</h4>
                      {!showNotesEdit && (
                        <button
                          disabled={action.pending}
                          hidden={!can('container.update')}
                          onClick={() => {
                            // Backend returns cargoDescription; fall back to the typed notes field for compatibility
                            const current = (activeVisit as ContainerVisit & { cargoDescription?: string }).cargoDescription ?? activeVisit.notes ?? '';
                            setNotesText(current);
                            setShowNotesEdit(true);
                          }}
                          className="px-3 py-1 text-blue-600 font-semibold hover:underline text-xs"
                        >
                          Chỉnh sửa
                        </button>
                      )}
                    </div>
                    {showNotesEdit ? (
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={notesText}
                          onChange={(e) => setNotesText(e.target.value)}
                          placeholder="Nhập ghi chú nội bộ (ví dụ: Hàng dễ vỡ — đặt tầng 1)..."
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            disabled={action.pending}
                            onClick={() => setShowNotesEdit(false)}
                            className="px-3 py-1 border border-slate-300 text-slate-600 rounded-lg text-xs"
                          >
                            Hủy
                          </button>
                          <button
                            disabled={action.pending}
                            onClick={async () => {
                              const res = await action.run(() => updateContainerVisit(activeVisit.id, { notes: notesText.trim() || undefined }));
                              if (res?.success) setShowNotesEdit(false);
                            }}
                            className="px-3 py-1 bg-blue-600 text-white rounded-lg font-bold text-xs hover:bg-blue-700"
                          >
                            Lưu ghi chú
                          </button>
                        </div>
                      </div>
                    ) : (() => {
                        // Backend returns field as cargoDescription; fall back to typed notes for compatibility
                        const displayNotes = (activeVisit as ContainerVisit & { cargoDescription?: string }).cargoDescription ?? activeVisit.notes;
                        return (
                          <p className={`text-xs ${displayNotes ? 'text-slate-800 whitespace-pre-wrap' : 'text-slate-400 italic'}`}>
                            {displayNotes || 'Chưa có ghi chú nội bộ'}
                          </p>
                        );
                      })()}
                  </div>

                  {/* Metadata Specs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/50">
                      <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                        Hồ sơ hàng hóa
                      </div>
                      <div>
                        MBL: <strong className="font-mono">{activeVisit.mblNumber}</strong>
                      </div>
                      <div>
                        HBL: <strong className="font-mono">{activeVisit.hblNumber}</strong>
                      </div>
                      <div>
                        Seal Manifest:{' '}
                        <strong className="font-mono">{activeVisit.manifestSeal}</strong>
                      </div>
                      <div>
                        Seal Tiếp nhận:{' '}
                        <strong className="font-mono text-blue-700">
                          {activeVisit.actualSeal || '—'}
                        </strong>
                      </div>
                      <div>
                        Trọng lượng tổng:{' '}
                        <strong>{activeVisit.grossWeightKg.toLocaleString()} kg</strong>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-slate-50/50">
                      <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                        Vị trí & Thời gian
                      </div>
                      <div>
                        Vị trí Bãi:{' '}
                        <strong className="font-mono text-emerald-700">
                          {yardLocationLabel(activeVisit)}
                        </strong>
                      </div>
                      <div>
                        Ngày vào cổng:{' '}
                        <strong>
                          {activeVisit.gateInAt
                            ? formatVietnamDateTime(activeVisit.gateInAt)
                            : '—'}
                        </strong>
                      </div>
                      <div>
                        Ngày ra cổng:{' '}
                        <strong>
                          {activeVisit.gateOutAt
                            ? formatVietnamDateTime(activeVisit.gateOutAt)
                            : '—'}
                        </strong>
                      </div>
                      <div>
                        Ngưỡng cảnh báo lưu bãi:{' '}
                        <strong>
                          {activeVisit.freeDays === undefined
                            ? 'Chưa có dữ liệu chính sách'
                            : `${activeVisit.freeDays} ngày`}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: YARD OPS */}
              {activeDetailTab === 'YARD_OPS' && (
                <div className="space-y-4">
                  {/* Current Position */}
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-800">Vị trí hiện tại trong bãi:</div>
                      <div className="text-base font-mono font-bold text-blue-700">
                        {yardLocationLabel(activeVisit, 'Chưa có vị trí')}
                      </div>
                    </div>
                    <button
                      disabled={action.pending}
                      hidden={!can('yard.update')}
                      onClick={() => {
                        setActiveModalVisitId(null);
                        onNavigate('yard', activeVisit.id);
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                      Xếp / Đổi vị trí bãi
                    </button>
                  </div>

                  {/* Inspections section */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800">Lệnh kiểm hóa / giám định</h4>
                      <button
                        disabled={action.pending}
                        hidden={!can('yard.update')}
                        onClick={() => { setActiveModalVisitId(null); onNavigate('yard', activeVisit.id); }}
                        className="px-3 py-1.5 bg-amber-600 text-white rounded-lg font-semibold text-xs hover:bg-amber-700"
                      >
                        Tạo lệnh kiểm hóa →
                      </button>
                    </div>
                    <p className="text-slate-500 italic text-xs">
                      Danh sách lệnh kiểm hóa và kết quả được quản lý tại màn hình Vận hành Bãi.
                      Nhân viên bãi cập nhật trạng thái qua thiết bị di động.
                    </p>
                  </div>

                  {/* Yard Bookings */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-slate-800">Đặt lịch tác nghiệp bãi (rút hàng / đóng hàng)</h4>
                      <button
                        disabled={action.pending}
                        hidden={!can('yard.update')}
                        onClick={() => { setActiveModalVisitId(null); onNavigate('yard', activeVisit.id); }}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-semibold text-xs hover:bg-blue-700"
                      >
                        Đến Vận hành Bãi →
                      </button>
                    </div>
                    <p className="text-slate-500 italic text-xs">
                      Lịch sử di chuyển trong bãi và các lần tác nghiệp được nhân viên bãi cập nhật
                      trực tiếp qua thiết bị di động. Truy cập màn hình Vận hành Bãi để xem lịch sử
                      đầy đủ và phân công công việc.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 3: BILLING */}
              {activeDetailTab === 'BILLING' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800">Danh sách hóa đơn & đơn dịch vụ</h4>
                    <button
                      disabled={action.pending}
                      hidden={!can('billing.manage')}
                      onClick={() => {
                        setActiveModalVisitId(null);
                        onNavigate('billing', activeVisit.id);
                      }}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                      + Tạo đơn dịch vụ
                    </button>
                  </div>

                  {/* Billing summary bar (CONT-07) */}
                  {readable(invoiceState) && activeVisitInvoices.length > 0 && (() => {
                    const totalVnd = activeVisitInvoices.reduce((s, i) => s + (i.totalAmountVnd ?? 0), 0);
                    const paidVnd = activeVisitInvoices.reduce((s, i) => s + (i.paidAmountVnd ?? 0), 0);
                    const remaining = totalVnd - paidVnd;
                    return (
                      <div className="flex flex-wrap gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200 font-semibold">
                        <span className="text-slate-700">Tổng phí: <strong>{totalVnd.toLocaleString()}₫</strong></span>
                        <span className="text-emerald-700">Đã thanh toán: <strong>{paidVnd.toLocaleString()}₫</strong></span>
                        <span className={remaining > 0 ? 'text-rose-700' : 'text-emerald-700'}>
                          Còn lại: <strong>{remaining.toLocaleString()}₫</strong>
                          {remaining > 0 && <span className="ml-1 text-caption font-normal">(chưa thanh toán đủ)</span>}
                        </span>
                      </div>
                    );
                  })()}

                  {invoiceState !== 'ready' && <CollectionState resource="invoices" count={activeVisitInvoices.length} />}
                  {invoiceState === 'ready' && activeVisitInvoices.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl">
                      Chưa phát sinh hóa đơn nào.{' '}
                      {can('billing.manage') && (
                        <button
                          disabled={action.pending}
                          onClick={() => { setActiveModalVisitId(null); onNavigate('billing', activeVisit.id); }}
                          className="text-blue-600 font-semibold hover:underline"
                        >
                          Tạo đơn dịch vụ →
                        </button>
                      )}
                    </div>
                  ) : (
                    readable(invoiceState) && activeVisitInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-700">{inv.invoiceNo}</span>
                          <StatusBadge domain="invoiceStatus" value={inv.status} />
                        </div>
                        <div className="flex justify-between text-slate-600">
                          <span>
                            Tổng tiền: <strong>{inv.totalAmountVnd.toLocaleString()}₫</strong>
                          </span>
                          <span>
                            Đã thanh toán:{' '}
                            <strong className="text-emerald-700">
                              {inv.paidAmountVnd.toLocaleString()}₫
                            </strong>
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 4: GATE PASS */}
              {activeDetailTab === 'GATE_PASS' && (
                <div className="space-y-4">
                  {!passesReady ? (
                    <CriticalDataNotice kind="gatePasses" visitId={activeVisit.id} />
                  ) : activeVisitGatePass ? (
                    <div className="border border-indigo-200 bg-indigo-50/40 rounded-xl p-5 text-center space-y-3">
                      <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-full">
                        Phiếu ra cổng đang hiệu lực
                      </div>
                      <div className="text-xl font-mono font-bold text-slate-900">
                        {activeVisitGatePass.code}
                      </div>
                      <div className="text-slate-600">
                        Xe lấy hàng: <strong>{activeVisitGatePass.vehiclePlate}</strong> · Người
                        nhận: <strong>{activeVisitGatePass.receiverName}</strong> (
                        {activeVisitGatePass.receiverIdNumber})
                      </div>
                      <div className="p-4 bg-white rounded-xl inline-block border border-slate-200 shadow-xs">
                        {activeVisitGatePass.qrToken ? (
                          <QRCode
                            value={activeVisitGatePass.qrToken}
                            size={160}
                            data-testid="container-gate-pass-qr"
                          />
                        ) : (
                          <p>Phiếu ra cổng chưa có mã QR. Vui lòng tải lại trang hoặc liên hệ bộ phận kỹ thuật.</p>
                        )}
                        <div className="text-caption font-mono text-slate-400 mt-1">
                          {activeVisitGatePass.qrToken}
                        </div>
                      </div>
                      <div className="text-slate-500">
                        Hạn sử dụng:{' '}
                        <strong>
                          {formatVietnamDateTime(activeVisitGatePass.expiresAt)}
                        </strong>
                      </div>
                      {(() => {
                        const expiresMs = new Date(activeVisitGatePass.expiresAt).getTime() - now;
                        if (expiresMs <= 0) {
                          return (
                            <div className="text-rose-700 font-semibold">
                              Phiếu đã hết hạn — cần cấp lại
                            </div>
                          );
                        }
                        const hoursLeft = Math.floor(expiresMs / (3600 * 1000));
                        const minutesLeft = Math.floor((expiresMs % (3600 * 1000)) / 60000);
                        const isNearExpiry = expiresMs < 2 * 3600 * 1000;
                        return (
                          <div className={`font-semibold ${isNearExpiry ? 'text-amber-700' : 'text-emerald-700'}`}>
                            ⏱ Còn hiệu lực: {hoursLeft} giờ {minutesLeft} phút
                            {isNearExpiry && <span className="ml-2 text-caption font-normal">(sắp hết hạn)</span>}
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="p-6 border border-slate-200 rounded-xl bg-slate-50 space-y-4">
                      <h4 className="font-bold text-slate-800">
                        Phát hành Phiếu ra cổng (Gate Pass)
                      </h4>
                      {evaluation.status === 'ready' ? (
                        <form
                          hidden={!can('gate_pass.create')}
                          noValidate
                          onSubmit={issueInlinePass}
                          className="space-y-3"
                        >
                          <FormErrors errors={validation.errors} />
                          <fieldset disabled={action.pending} className="space-y-3">
                            <p className="text-emerald-700 font-semibold">
                              ✓ Container đã vượt qua 100% điều kiện kiểm tra sẵn sàng ra cổng
                              (Readiness Pass).
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label
                                  htmlFor="containers-gp-plate"
                                  className="block text-slate-600 mb-1"
                                >
                                  Biển số xe nhận
                                </label>
                                <input
                                  id="containers-gp-plate"
                                  required
                                  {...validation.props('containers-gp-plate')}
                                  type="text"
                                  value={gpPlate}
                                  onChange={(e) => setGpPlate(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor="containers-gp-receiver"
                                  className="block text-slate-600 mb-1"
                                >
                                  Tên người nhận
                                </label>
                                <input
                                  id="containers-gp-receiver"
                                  required
                                  {...validation.props('containers-gp-receiver')}
                                  type="text"
                                  value={gpReceiver}
                                  onChange={(e) => setGpReceiver(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                                />
                              </div>
                              <div>
                                <label
                                  htmlFor="containers-gp-cccd"
                                  className="block text-slate-600 mb-1"
                                >
                                  Số CMND / CCCD
                                </label>
                                <input
                                  id="containers-gp-cccd"
                                  required
                                  {...validation.props('containers-gp-cccd')}
                                  type="text"
                                  value={gpCccd}
                                  onChange={(e) => setGpCccd(e.target.value)}
                                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                                />
                              </div>
                            </div>
                          </fieldset>
                          <button
                            disabled={action.pending}
                            type="submit"
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                          >
                            Xác nhận Tạo Phiếu Ra Cổng & Sinh mã QR
                          </button>
                        </form>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg">
                          <ReadinessNotice
                            evaluation={evaluation}
                            resolveBlocker={(code) => {
                              if (['NO_YARD_POSITION', 'ACTIVE_YARD_OPERATION', 'INSPECTION_HOLD'].includes(code)) {
                                return { label: 'Đến Tác nghiệp bãi', onClick: () => setActiveDetailTab('YARD_OPS') };
                              }
                              if (['NO_BILLING', 'BILLING_INCOMPLETE', 'UNBILLED_SERVICES', 'BILLING_CONFIGURATION_MISSING'].includes(code)) {
                                return { label: 'Đến Dịch vụ & Thanh toán', onClick: () => { setActiveModalVisitId(null); onNavigate('billing', activeVisit.id); } };
                              }
                              if (code === 'OPERATIONAL_HOLD') {
                                return { label: 'Xem lệnh giữ', onClick: () => setActiveDetailTab('HOLDS') };
                              }
                              return null;
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: HOLDS */}
              {activeDetailTab === 'HOLDS' && (
                <div className="space-y-4">
                  <CriticalDataNotice kind="holds" visitId={activeVisit.id} />
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800">
                      Lệnh giữ nghiệp vụ (Operational Holds)
                    </h4>
                    <button
                      disabled={action.pending}
                      hidden={!can('operational_hold.manage')}
                      onClick={() => setShowAddHold(true)}
                      className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Đặt lệnh giữ (Hold)</span>
                    </button>
                  </div>

                  {showAddHold && can('operational_hold.manage') && (
                    <div className="p-4 border border-rose-200 bg-rose-50/40 rounded-xl space-y-3">
                      <div className="font-bold text-rose-900">Thiết lập Lệnh giữ mới</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label
                            htmlFor="containers-new-hold-type"
                            className="block text-slate-600 mb-1"
                          >
                            Loại lệnh giữ
                          </label>
                          <select
                            id="containers-new-hold-type"
                            value={newHoldType}
                            onChange={(e) => setNewHoldType(e.target.value as HoldType)}
                            className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                          >
                            <option value="CUSTOMS">Hải quan (Customs Hold)</option>
                            <option value="SHIPPING_LINE">Hãng tàu (Shipping Line Hold)</option>
                            <option value="DAMAGE">Hư hỏng vỏ (Damage Hold)</option>
                            <option value="SECURITY">An ninh (Security Hold)</option>
                            <option value="DOCUMENT">Chứng từ (Document Hold)</option>
                            <option value="OTHER">Khác (Other)</option>
                          </select>
                        </div>
                        <div>
                          <label
                            htmlFor="containers-new-hold-reason"
                            className="block text-slate-600 mb-1"
                          >
                            Lý do chi tiết*
                          </label>
                          <input
                            id="containers-new-hold-reason"
                            type="text"
                            placeholder="Nhập lý do giữ..."
                            value={newHoldReason}
                            onChange={(e) => setNewHoldReason(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded bg-white"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <button
                          disabled={action.pending}
                          type="button"
                          onClick={() => setShowAddHold(false)}
                          className="px-3 py-1 border border-slate-300 rounded text-slate-600"
                        >
                          Hủy
                        </button>
                        <button
                          type="button"
                          disabled={action.pending}
                          onClick={async () => {
                            if (!newHoldReason.trim()) return;
                            const result = await action.run(() =>
                              createOperationalHold(
                                activeVisit.id,
                                newHoldType,
                                newHoldReason.trim(),
                              ),
                            );
                            if (!result?.success) return;
                            setNewHoldReason('');
                            setShowAddHold(false);
                          }}
                          className="px-3 py-1 bg-rose-600 text-white rounded font-bold"
                        >
                          Lưu Lệnh Giữ
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    {activeVisitHolds.map((h) => (
                      <div
                        key={h.id}
                        className={`p-3 rounded-lg border flex items-center justify-between ${
                          h.status === 'ACTIVE'
                            ? 'bg-rose-50/50 border-rose-200'
                            : 'bg-slate-50 border-slate-200 text-slate-400'
                        }`}
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <StatusBadge domain="holdType" value={h.holdType} />
                            <StatusBadge domain="holdStatus" value={h.status} />
                          </div>
                          <div className="text-slate-700 mt-1">{h.reason}</div>
                          <div className="text-caption text-slate-400 mt-1">
                            Đặt bởi: {h.placedBy}
                          </div>
                        </div>

                        {h.status === 'ACTIVE' && (
                          <button
                            hidden={!can('operational_hold.manage')}
                            disabled={action.pending}
                            onClick={() => setReleaseHoldTarget(h.id)}
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                          >
                            Giải phóng lệnh giữ
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: TIMELINE */}
              {activeDetailTab === 'TIMELINE' && (() => {
                type TLEvent = { ts: number; label: string; detail: string; color: string; category: 'LOCATION' | 'FINANCE' | 'HOLDS' | 'GATE' | 'ALL' };
                const events: TLEvent[] = [];

                if (activeVisit.gateOutAt)
                  events.push({ ts: new Date(activeVisit.gateOutAt).getTime(), label: 'Xác nhận ra cổng', detail: formatVietnamDateTime(activeVisit.gateOutAt) + ' (UTC+7)', color: 'bg-slate-900', category: 'GATE' });
                if (activeVisit.currentLocation && !yardLocationForbidden)
                  events.push({ ts: 0, label: `Xếp vị trí bãi: ${yardLocationLabel(activeVisit)}`, detail: yardLocationReady ? 'Đã xếp vào khu vực bãi' : 'Vị trí tải trước; chưa xác nhận.', color: 'bg-blue-600', category: 'LOCATION' });
                if (activeVisit.gateInAt)
                  events.push({ ts: new Date(activeVisit.gateInAt).getTime(), label: 'Tiếp nhận vào cổng (Gate-in)', detail: formatVietnamDateTime(activeVisit.gateInAt) + ' (UTC+7)', color: 'bg-emerald-600', category: 'GATE' });
                activeVisitHolds.forEach((h) => {
                  events.push({ ts: 0, label: `Đặt lệnh giữ: ${businessLabel('holdType', h.holdType)}`, detail: h.reason + (h.placedBy ? ` — ${h.placedBy}` : ''), color: 'bg-rose-600', category: 'HOLDS' });
                  if (h.status === 'RELEASED')
                    events.push({ ts: 0, label: `Giải phóng lệnh giữ: ${businessLabel('holdType', h.holdType)}`, detail: h.reason, color: 'bg-emerald-500', category: 'HOLDS' });
                });
                activeVisitInvoices.forEach((inv) => {
                  events.push({ ts: 0, label: `Hóa đơn ${inv.invoiceNo}: ${businessLabel('invoiceStatus', inv.status)}`, detail: `Tổng: ${inv.totalAmountVnd.toLocaleString()}₫ — Đã TT: ${inv.paidAmountVnd.toLocaleString()}₫`, color: 'bg-amber-600', category: 'FINANCE' });
                });
                if (activeVisitGatePass) {
                  events.push({ ts: 0, label: `Cấp phiếu ra cổng: ${activeVisitGatePass.code}`, detail: `Xe: ${activeVisitGatePass.vehiclePlate} — Người nhận: ${activeVisitGatePass.receiverName}`, color: 'bg-indigo-600', category: 'GATE' });
                }
                events.push({ ts: 0, label: 'Khai báo Manifest', detail: activeVisit.manifestNo, color: 'bg-slate-400', category: 'LOCATION' });

                const shown = timelineFilter === 'ALL' ? events : events.filter(e => e.category === timelineFilter);

                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-bold text-slate-800">Dòng thời gian sự kiện (UTC+7)</h4>
                      <div className="flex flex-wrap gap-1 text-caption">
                        {(['ALL', 'LOCATION', 'FINANCE', 'HOLDS', 'GATE'] as const).map((f) => (
                          <button
                            key={f}
                            onClick={() => setTimelineFilter(f)}
                            className={`px-2 py-1 rounded font-semibold border transition ${timelineFilter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                          >
                            {f === 'ALL' ? 'Tất cả' : f === 'LOCATION' ? 'Vị trí' : f === 'FINANCE' ? 'Tài chính' : f === 'HOLDS' ? 'Lệnh giữ' : 'Cổng'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="pl-4 border-l-2 border-blue-400 space-y-4">
                      {shown.length === 0 ? (
                        <p className="text-slate-400 italic">Không có sự kiện nào trong nhóm này.</p>
                      ) : (
                        shown.map((ev, idx) => (
                          <div key={idx} className="relative">
                            <div className={`w-2.5 h-2.5 rounded-full ${ev.color} absolute -left-[21px] top-1`}></div>
                            <div className="font-bold text-slate-800">{ev.label}</div>
                            <div className="text-slate-500">{ev.detail}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-200 flex justify-end shrink-0">
              <button
                disabled={action.pending}
                onClick={() => setActiveModalVisitId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs"
              >
                Đóng
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* Confirm: Cancel Container Visit (CONT-02) */}
      {showCancelConfirm && activeVisit && (
        <ConfirmDialog
          title="Xác nhận hủy hồ sơ container"
          message="Thao tác này sẽ hủy toàn bộ hồ sơ container và không thể hoàn tác."
          summary={[
            { label: 'Số container', value: activeVisit.containerNumber },
            { label: 'Trạng thái hiện tại', value: businessLabel('containerVisitStatus', activeVisit.state) },
            { label: 'Chủ hàng', value: activeVisit.consigneeName },
          ]}
          reason={{ label: 'Lý do hủy', placeholder: 'Nhập lý do hủy hồ sơ...', minLength: 5 }}
          confirmLabel="Xác nhận hủy"
          tone="danger"
          pending={action.pending}
          notice={action.notice}
          onClose={() => setShowCancelConfirm(false)}
          onConfirm={async (reason) => {
            const res = await action.run(() => cancelContainerVisit(activeVisit.id, reason));
            if (res?.success) {
              setShowCancelConfirm(false);
              setActiveModalVisitId(null);
            }
          }}
        />
      )}

      {/* Confirm: Release Operational Hold (CONT-02) */}
      {releaseHoldTarget && activeVisit && (() => {
        const targetHold = activeVisitHolds.find((h) => h.id === releaseHoldTarget);
        if (!targetHold) return null;
        return (
          <ConfirmDialog
            title="Xác nhận giải phóng lệnh giữ"
            message="Giải phóng lệnh giữ sẽ cho phép container tiếp tục quy trình. Vui lòng nhập lý do để lưu vết."
            summary={[
              { label: 'Container', value: activeVisit.containerNumber },
              { label: 'Loại lệnh giữ', value: businessLabel('holdType', targetHold.holdType) },
              { label: 'Lý do ban đầu', value: targetHold.reason },
            ]}
            reason={{ label: 'Lý do giải phóng', placeholder: 'Nhập lý do giải phóng lệnh giữ...', minLength: 5 }}
            confirmLabel="Giải phóng lệnh giữ"
            tone="primary"
            pending={action.pending}
            notice={action.notice}
            onClose={() => setReleaseHoldTarget(null)}
            onConfirm={async (reason) => {
              const res = await action.run(() => releaseOperationalHold(targetHold.id, reason));
              if (res?.success) setReleaseHoldTarget(null);
            }}
          />
        );
      })()}

      {/* Create Container Visit Modal */}
      {showCreateVisit && (
        <ModalOverlay
          pending={action.pending}
          aria-labelledby="containers-dialog-2-title"
          onClose={() => setShowCreateVisit(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="containers-dialog-2-title" className="text-base font-bold text-slate-900 mb-4">
              Tiếp nhận Container Mới vào ICD
            </h3>
            <form noValidate onSubmit={saveContainerVisit} className="space-y-3">
              <FormErrors errors={validation.errors} />
              <CommandNotice notice={action.notice} />
              <fieldset disabled={action.pending} className="space-y-3">
                <div>
                  <label
                    htmlFor="containers-cv-form-container-number"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Số container* (ISO 6346)
                  </label>
                  <input
                    id="containers-cv-form-container-number"
                    required
                    pattern="[A-Z]{4}[0-9]{7}"
                    title="Số container phải có định dạng ISO 6346: 4 chữ hoa + 7 số (ví dụ: MSCU1234567)"
                    {...validation.props('containers-cv-form-container-number')}
                    type="text"
                    value={cvForm.containerNumber}
                    onChange={(e) =>
                      setCvForm({ ...cvForm, containerNumber: e.target.value.toUpperCase() })
                    }
                    placeholder="Ví dụ: MSCU1234567 (4 chữ hoa + 7 số)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono"
                  />
                  <p className="text-caption text-slate-500 mt-1">Định dạng ISO 6346: 4 chữ hoa + 7 số (ví dụ: MSCU1234567)</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="containers-cv-form-container-type"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Loại container
                    </label>
                    <select
                      id="containers-cv-form-container-type"
                      value={cvForm.containerType}
                      onChange={(e) =>
                        setCvForm({
                          ...cvForm,
                          containerType: e.target.value as ContainerVisit['containerType'],
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="20GP">20' khô (20GP)</option>
                      <option value="40GP">40' khô (40GP)</option>
                      <option value="40HC">40' cao (40HC)</option>
                      <option value="20RF">20' lạnh (20RF)</option>
                      <option value="45HC">45' cao (45HC)</option>
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="containers-create-shipping-line"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Hãng tàu
                    </label>
                    <input
                      id="containers-create-shipping-line"
                      readOnly
                      value={formManifest?.shippingLine || ''}
                      placeholder="Theo Manifest đã chọn"
                      aria-label="Hãng tàu theo Manifest"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="containers-create-consignee"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Chủ hàng (Consignee)*
                  </label>
                  <select
                    id="containers-create-consignee"
                    aria-label="Chủ hàng"
                    value={cvForm.consigneeName}
                    onChange={(e) => setCvForm({ ...cvForm, consigneeName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  >
                    <option value="">Chọn chủ hàng</option>
                    {consignees
                      .filter((c) => c.active)
                      .map((c) => (
                        <option key={c.id} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label
                      htmlFor="containers-create-manifest"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Manifest No.
                    </label>
                    <select
                      id="containers-create-manifest"
                      required
                      {...validation.props('containers-create-manifest')}
                      aria-label="Manifest"
                      value={cvForm.manifestNo}
                      onChange={(e) =>
                        setCvForm({
                          ...cvForm,
                          manifestNo: e.target.value,
                          mblNumber: '',
                          hblNumber: '',
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">Chọn Manifest</option>
                      {manifests
                        .filter((m) => m.status !== 'CANCELLED')
                        .map((m) => (
                          <option key={m.id} value={m.manifestNo}>
                            {m.manifestNo}
                          </option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="containers-create-mbl"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      MBL No.
                    </label>
                    <select
                      id="containers-create-mbl"
                      required
                      {...validation.props('containers-create-mbl')}
                      aria-label="Master BL"
                      value={cvForm.mblNumber}
                      onChange={(e) =>
                        setCvForm({ ...cvForm, mblNumber: e.target.value, hblNumber: '' })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">Chọn MBL</option>
                      {formManifest?.masterBills.map((m) => (
                        <option key={m.id} value={m.mblNumber}>
                          {m.mblNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      htmlFor="containers-create-hbl"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      HBL No.
                    </label>
                    <select
                      id="containers-create-hbl"
                      required
                      {...validation.props('containers-create-hbl')}
                      aria-label="House BL"
                      value={cvForm.hblNumber}
                      onChange={(e) => {
                        const h = formMaster?.houseBills.find(
                          (h) => h.hblNumber === e.target.value,
                        );
                        setCvForm({
                          ...cvForm,
                          hblNumber: e.target.value,
                          consigneeName: h?.consigneeName || cvForm.consigneeName,
                        });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    >
                      <option value="">Chọn HBL</option>
                      {formMaster?.houseBills.map((h) => (
                        <option key={h.id} value={h.hblNumber}>
                          {h.hblNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="containers-cv-form-manifest-seal"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Seal Manifest*
                    </label>
                    <input
                      id="containers-cv-form-manifest-seal"
                      required
                      {...validation.props('containers-cv-form-manifest-seal')}
                      type="text"
                      value={cvForm.manifestSeal}
                      onChange={(e) => setCvForm({ ...cvForm, manifestSeal: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="containers-cv-form-gross-weight-kg"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Trọng lượng (kg)
                    </label>
                    <input
                      id="containers-cv-form-gross-weight-kg"
                      type="number"
                      min="1"
                      value={cvForm.grossWeightKg}
                      onChange={(e) =>
                        setCvForm({ ...cvForm, grossWeightKg: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </fieldset>
              <div className="flex justify-end space-x-2 pt-4 mt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={action.pending}
                  onClick={() => setShowCreateVisit(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium"
                >
                  Hủy
                </button>
                <button
                  disabled={action.pending}
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                >
                  Tiếp nhận container
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
