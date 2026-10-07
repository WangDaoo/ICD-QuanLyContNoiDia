import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { readinessLabel } from '../services/readiness-labels';
import { ContainerVisit, ContainerState, HoldType } from '../types';
import {
  Boxes,
  Search,
  CheckCircle2,
  XCircle,
  Warehouse,
  Receipt,
  ShieldAlert,
  Send,
  Plus,
  ChevronRight,
} from 'lucide-react';
import { NavTabId } from './Sidebar';
import { useBackendReadiness } from './useBackendReadiness';
import { CriticalDataNotice } from './CriticalDataNotice';

import { useCommandAction, CommandNotice } from './useCommandAction';

import QRCode from 'react-qr-code';
import { effectiveGatePassStatus } from '../lib/gate-pass';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState } from './CollectionState';
import { ReadinessNotice } from './ReadinessNotice';
import { useGatePassExpiry } from './useGatePassExpiry';
import { hasWebPermission } from '../services/permissions';
import { ReadOnlyNotice } from './ReadOnlyNotice';

interface ContainersViewProps {
  onNavigate: (tab: NavTabId, contextId?: string) => void;
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
    createMovementOrder,
    movementOrders,
  } = useApp();
  const can = (permission: string) => hasWebPermission(currentUser, permission);

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

  const filteredVisits = containerVisits.filter((v) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchNo = v.containerNumber.toLowerCase().includes(q);
      const matchCsg = v.consigneeName.toLowerCase().includes(q);
      const matchMnf = v.manifestNo.toLowerCase().includes(q);
      if (!matchNo && !matchCsg && !matchMnf) return false;
    }

    if (stateFilter !== 'ALL' && v.state !== stateFilter) return false;

    if (hasBlockerOnly) {
      const activeHolds = holds.filter((h) => h.containerVisitId === v.id && h.status === 'ACTIVE');
      const invs = invoices.filter((i) => i.containerVisitId === v.id && i.status !== 'PAID');
      if (
        visitSafetyStatus[v.id]?.holds === 'ready' &&
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

  const getStateBadge = (state: ContainerState) => {
    switch (state) {
      case 'PENDING':
        return (
          <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-slate-100 text-slate-700">
            PENDING
          </span>
        );
      case 'AUTHORIZED':
        return (
          <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-blue-100 text-blue-800">
            AUTHORIZED
          </span>
        );
      case 'IN_YARD':
        return (
          <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-emerald-100 text-emerald-800">
            IN_YARD
          </span>
        );
      case 'UNDER_INSPECTION':
        return (
          <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-amber-100 text-amber-800">
            UNDER_INSPECTION
          </span>
        );
      case 'IN_STRIPPING':
        return (
          <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-purple-100 text-purple-800">
            IN_STRIPPING
          </span>
        );
      case 'GATE_PASS_ISSUED':
        return (
          <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-indigo-100 text-indigo-800">
            GATE_PASS_ISSUED
          </span>
        );
      case 'EXITED':
        return (
          <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-slate-200 text-slate-800">
            EXITED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-caption font-bold bg-slate-100 text-slate-600">
            {state}
          </span>
        );
    }
  };

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
            Tổng cộng: {containerVisits.length} containers
          </span>
          <button
            hidden={!can('container.create')}
            onClick={() => setShowCreateVisit(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Container Visit</span>
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
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm theo số cont, chủ hàng, manifest..."
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
            className="border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Pending</option>
            <option value="AUTHORIZED">Authorized (Chờ cổng)</option>
            <option value="IN_YARD">In Yard (Trong bãi)</option>
            <option value="UNDER_INSPECTION">Under Inspection</option>
            <option value="GATE_PASS_ISSUED">Gate Pass Issued</option>
            <option value="EXITED">Exited (Đã ra cổng)</option>
          </select>

          <label className="flex items-center space-x-1.5 cursor-pointer ml-2 text-slate-700 select-none">
            <input
              type="checkbox"
              checked={hasBlockerOnly}
              onChange={(e) => setHasBlockerOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Chỉ container có Blocker (Lệnh giữ / Chưa thanh toán / Chưa vị trí)</span>
          </label>
        </div>

        <span className="text-slate-400">Hiển thị {filteredVisits.length} containers</span>
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
                <th className="py-3 px-4">Chủ hàng (Consignee)</th>
                <th className="py-3 px-4">Vị trí Bãi</th>
                <th className="py-3 px-4">Trạng thái</th>
                <th className="py-3 px-4">Vào cổng</th>
                <th className="py-3 px-4">Ngày lưu</th>
                <th className="py-3 px-4">Blockers</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVisits.map((v) => {
                const activeHoldsCount = holds.filter(
                  (h) => h.containerVisitId === v.id && h.status === 'ACTIVE',
                ).length;
                const hasUnpaid = invoices.some(
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
                    <td className="py-3 px-4 font-semibold text-slate-700">{v.containerType}</td>
                    <td className="py-3 px-4 text-slate-800 max-w-[200px] truncate">
                      {v.consigneeName}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                      {v.currentLocation ? (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded border border-blue-200">
                          {v.currentLocation}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa xếp</span>
                      )}
                    </td>
                    <td className="py-3 px-4">{getStateBadge(v.state)}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {v.gateInAt ? new Date(v.gateInAt).toLocaleDateString('vi-VN') : '—'}
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
                      <div className="flex items-center space-x-1.5">
                        {visitSafetyStatus[v.id]?.holds !== 'ready' && (
                          <span className="text-amber-900" title="Chưa xác minh lệnh giữ">
                            Holds chưa kiểm tra
                          </span>
                        )}
                        {visitSafetyStatus[v.id]?.holds === 'ready' && activeHoldsCount > 0 && (
                          <span
                            title="Có lệnh giữ (Hold)"
                            className="p-1 bg-amber-100 text-amber-800 rounded-md inline-flex items-center"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {hasUnpaid && (
                          <span
                            title="Còn công nợ chưa thanh toán"
                            className="p-1 bg-rose-100 text-rose-800 rounded-md inline-flex items-center"
                          >
                            <Receipt className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {!v.currentLocation && v.state === 'IN_YARD' && (
                          <span
                            title="Chưa xếp vị trí bãi"
                            className="p-1 bg-blue-100 text-blue-800 rounded-md inline-flex items-center"
                          >
                            <Warehouse className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {visitSafetyStatus[v.id]?.holds === 'ready' &&
                          activeHoldsCount === 0 &&
                          !hasUnpaid &&
                          v.currentLocation && (
                            <span className="text-emerald-600 inline-flex items-center">
                              <CheckCircle2 className="w-4 h-4" />
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setActiveModalVisitId(v.id);
                          setActiveDetailTab('OVERVIEW');
                        }}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded transition"
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
              <div>
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-bold font-mono text-slate-900">
                    {activeVisit.containerNumber}
                  </h3>
                  {getStateBadge(activeVisit.state)}
                  <span className="text-xs font-semibold px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-md">
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
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center space-x-1 border-b border-slate-200 mt-4 overflow-x-auto text-xs shrink-0">
              <button
                disabled={action.pending}
                onClick={() => setActiveDetailTab('OVERVIEW')}
                className={`px-4 py-2 font-bold border-b-2 transition ${
                  activeDetailTab === 'OVERVIEW'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Tổng quan & Readiness
              </button>
              <button
                disabled={action.pending}
                onClick={() => setActiveDetailTab('YARD_OPS')}
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
                className={`px-4 py-2 font-bold border-b-2 transition ${
                  activeDetailTab === 'BILLING'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Dịch vụ & Thanh toán ({activeVisitInvoices.length})
              </button>
              <button
                disabled={action.pending}
                onClick={() => setActiveDetailTab('GATE_PASS')}
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
                className={`px-4 py-2 font-bold border-b-2 transition ${
                  activeDetailTab === 'HOLDS'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                Lệnh giữ Holds (
                {holdsReady ? activeVisitHolds.filter((h) => h.status === 'ACTIVE').length : '?'})
              </button>
              <button
                disabled={action.pending}
                onClick={() => setActiveDetailTab('TIMELINE')}
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
                  {/* Readiness Checklist Card */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                      <span>
                        Kiểm tra Điều kiện Sẵn sàng Cấp Phiếu Ra Cổng (Readiness Checklist)
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-caption font-bold ${
                          readiness?.blockers.length === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {isCheckingReadiness
                          ? 'ĐANG KIỂM TRA'
                          : readiness
                            ? readiness.blockers.length === 0
                              ? 'ĐẠT'
                              : `${readiness.blockers.length} ĐIỀU KIỆN CHƯA ĐẠT`
                            : 'CHƯA CÓ KẾT QUẢ'}
                      </span>
                    </h4>

                    {readinessError && (
                      <p role="alert" className="mt-3 text-rose-700">
                        {readinessError}
                      </p>
                    )}
                    {readiness && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                        <div className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                          {readiness?.isContainerInYard ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                          <span>Trong bãi (IN_YARD)</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                          {readiness?.hasYardPosition ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                          <span>Đã có vị trí bãi</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                          {readiness?.isBillingCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                          <span>Thanh toán đủ 100%</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                          {readiness?.hasNoActiveYardOps ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                          <span>Không vướng tác nghiệp</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                          {readiness?.hasNoInspectionHold ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                          <span>Không giữ kiểm định</span>
                        </div>
                        <div className="flex items-center space-x-2 bg-white p-2.5 rounded-lg border border-slate-200">
                          {readiness?.hasNoOperationalHold ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <XCircle className="w-4 h-4 text-rose-600" />
                          )}
                          <span>Không lệnh giữ (Hold)</span>
                        </div>
                      </div>
                    )}

                    {readiness && readiness.blockers.length > 0 && (
                      <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800">
                        <strong>Các nguyên nhân chưa thể cấp Phiếu ra cổng:</strong>
                        <ul className="list-disc pl-4 mt-1 space-y-0.5">
                          {readiness.blockers.map((b, idx) => (
                            <li key={idx}>{readinessLabel(b)}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Movement Order & Visit Actions */}
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                      <span>Movement Order (Lệnh cho phép di chuyển về ICD)</span>
                      {(() => {
                        const mo = movementOrders.find(
                          (o) => o.containerVisitId === activeVisit.id && o.status !== 'CANCELLED',
                        );
                        return mo ? (
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-caption font-bold ${
                              mo.status === 'AUTHORIZED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : mo.status === 'DRAFT'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {mo.orderCode} · {mo.status}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-caption">
                            Chưa có Movement Order
                          </span>
                        );
                      })()}
                    </h4>
                    <div className="flex items-center gap-2 mt-2">
                      {!movementOrders.some(
                        (o) => o.containerVisitId === activeVisit.id && o.status !== 'CANCELLED',
                      ) &&
                        activeVisit.state === 'PENDING' && (
                          <button
                            hidden={!can('movement_order.create')}
                            disabled={action.pending}
                            onClick={() =>
                              void action.run(() => createMovementOrder(activeVisit.id))
                            }
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                          >
                            + Tạo Movement Order
                          </button>
                        )}
                      {['PENDING', 'AUTHORIZED'].includes(activeVisit.state) && (
                        <button
                          hidden={!can('container.cancel')}
                          disabled={action.pending}
                          onClick={async () => {
                            const reason = window.prompt('Lý do hủy Container Visit:');
                            if (reason) {
                              const res = await action.run(() =>
                                cancelContainerVisit(activeVisit.id, reason),
                              );
                              if (res?.success) setActiveModalVisitId(null);
                            }
                          }}
                          className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-bold border border-rose-200"
                        >
                          Hủy Container Visit
                        </button>
                      )}
                      <button
                        disabled={action.pending}
                        onClick={() => {
                          setActiveModalVisitId(null);
                          onNavigate('movement-orders' as NavTabId, activeVisit.id);
                        }}
                        className="px-3 py-1.5 text-blue-600 font-bold hover:underline"
                      >
                        Xem tất cả Movement Order →
                      </button>
                    </div>
                  </div>

                  {/* Transport Handover (Module 13) Card inside Container Detail */}
                  <div className="bg-indigo-50/70 p-4 rounded-xl border border-indigo-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Send className="w-4 h-4 text-indigo-700" />
                        <span className="font-bold text-indigo-950">
                          Bàn giao vận chuyển ngoài ICD
                        </span>
                      </div>
                      {activeVisitHandover ? (
                        <span className="px-2.5 py-0.5 rounded-full text-caption font-bold bg-indigo-200 text-indigo-900 border border-indigo-300">
                          {activeVisitHandover.status}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Chưa tạo Handover</span>
                      )}
                    </div>

                    {activeVisitHandover ? (
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
                          <span>Số mốc xác nhận: {activeVisitHandover.confirmations.length}</span>
                          <button
                            disabled={action.pending}
                            onClick={() => {
                              setActiveModalVisitId(null);
                              onNavigate('handovers', activeVisitHandover.id);
                            }}
                            className="font-bold text-indigo-600 hover:text-indigo-800 flex items-center"
                          >
                            <span>Xem tiến độ Bàn giao & Duyệt POD</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-slate-500 flex items-center justify-between">
                        <span>
                          {activeVisit.state === 'EXITED'
                            ? 'Container đã Exited, sẵn sàng tạo lệnh bàn giao cho đối tác vận chuyển.'
                            : 'Container chưa hoàn tất Gate-out. Có thể lập trước bản nháp DRAFT.'}
                        </span>
                        <button
                          disabled={action.pending}
                          onClick={() => {
                            setActiveModalVisitId(null);
                            onNavigate('handovers');
                          }}
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
                        >
                          + Tạo Handover
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Metadata Specs */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
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

                    <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
                      <div className="font-bold text-slate-800 border-b border-slate-200 pb-1">
                        Vị trí & Thời gian
                      </div>
                      <div>
                        Vị trí Bãi:{' '}
                        <strong className="font-mono text-emerald-700">
                          {activeVisit.currentLocation || 'Chưa xếp'}
                        </strong>
                      </div>
                      <div>
                        Ngày vào cổng:{' '}
                        <strong>
                          {activeVisit.gateInAt
                            ? new Date(activeVisit.gateInAt).toLocaleString('vi-VN')
                            : '—'}
                        </strong>
                      </div>
                      <div>
                        Ngày ra cổng:{' '}
                        <strong>
                          {activeVisit.gateOutAt
                            ? new Date(activeVisit.gateOutAt).toLocaleString('vi-VN')
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
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div>
                      <div className="font-bold text-slate-800">Vị trí hiện tại trong bãi:</div>
                      <div className="text-base font-mono font-bold text-blue-700">
                        {activeVisit.currentLocation || 'Chưa có vị trí'}
                      </div>
                    </div>
                    <button
                      disabled={action.pending}
                      hidden={!can('yard.update')}
                      onClick={() => {
                        setActiveModalVisitId(null);
                        onNavigate('yard', activeVisit.id);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                      Đổi vị trí / Điều chuyển
                    </button>
                  </div>
                  <p className="text-slate-500 italic text-center py-4">
                    Nhật ký di chuyển và kiểm tra bãi được cập nhật từ thiết bị di động của nhân
                    viên bãi (Yard Staff).
                  </p>
                </div>
              )}

              {/* TAB 3: BILLING */}
              {activeDetailTab === 'BILLING' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800">Danh sách Hóa đơn & Đơn dịch vụ</h4>
                    <button
                      disabled={action.pending}
                      hidden={!can('billing.manage')}
                      onClick={() => {
                        setActiveModalVisitId(null);
                        onNavigate('billing', activeVisit.id);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold"
                    >
                      + Tạo Đơn Dịch Vụ
                    </button>
                  </div>

                  {activeVisitInvoices.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl">
                      Chưa phát sinh hóa đơn nào
                    </div>
                  ) : (
                    activeVisitInvoices.map((inv) => (
                      <div
                        key={inv.id}
                        className="border border-slate-200 rounded-xl p-4 bg-white shadow-xs space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-blue-700">{inv.invoiceNo}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-caption font-bold ${
                              inv.status === 'PAID'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {inv.status}
                          </span>
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
                        PHIẾU RA CỔNG ĐANG HIỆU LỰC (ACTIVE)
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
                          <p>Backend chưa cung cấp mã QR cho phiếu này.</p>
                        )}
                        <div className="text-caption font-mono text-slate-400 mt-1">
                          {activeVisitGatePass.qrToken}
                        </div>
                      </div>
                      <div className="text-slate-500">
                        Hạn sử dụng:{' '}
                        <strong>
                          {new Date(activeVisitGatePass.expiresAt).toLocaleString('vi-VN')}
                        </strong>
                      </div>
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
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
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
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
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
                                  className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
                                />
                              </div>
                            </div>
                          </fieldset>
                          <button
                            disabled={action.pending}
                            type="submit"
                            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition"
                          >
                            Xác nhận Tạo Phiếu Ra Cổng & Sinh mã QR
                          </button>
                        </form>
                      ) : (
                        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg">
                          <ReadinessNotice evaluation={evaluation} />
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
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold flex items-center space-x-1"
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
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
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
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded bg-white"
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
                            <span className="font-bold text-slate-900">[{h.holdType}]</span>
                            <span
                              className={`px-2 py-0.2 rounded-full text-caption font-bold ${
                                h.status === 'ACTIVE'
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {h.status}
                            </span>
                          </div>
                          <div className="text-slate-700 mt-1">{h.reason}</div>
                          <div className="text-caption text-slate-400 mt-0.5">
                            Đặt bởi: {h.placedBy}
                          </div>
                        </div>

                        {h.status === 'ACTIVE' && (
                          <button
                            hidden={!can('operational_hold.manage')}
                            disabled={action.pending}
                            onClick={async () => {
                              const note = prompt('Nhập lý do giải phóng lệnh giữ:');
                              if (
                                note &&
                                window.confirm(
                                  `Giải phóng lệnh giữ ${h.holdType} cho ${activeVisit.containerNumber}?`,
                                )
                              )
                                await action.run(() => releaseOperationalHold(h.id, note));
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg"
                          >
                            Release Hold
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: TIMELINE */}
              {activeDetailTab === 'TIMELINE' && (
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-800">
                    Dòng thời gian sự kiện (Container Lifecycle Events)
                  </h4>
                  <div className="pl-4 border-l-2 border-blue-400 space-y-4">
                    {activeVisit.gateOutAt && (
                      <div className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-slate-900 absolute -left-[21px] top-1"></div>
                        <div className="font-bold text-slate-800">Xác nhận ra cổng (Gate-out)</div>
                        <div className="text-slate-500">
                          {new Date(activeVisit.gateOutAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    )}
                    {activeVisit.currentLocation && (
                      <div className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-600 absolute -left-[21px] top-1"></div>
                        <div className="font-bold text-slate-800">
                          Xếp vị trí bãi {activeVisit.currentLocation}
                        </div>
                        <div className="text-slate-500">Đã lưu trữ an toàn trong khu vực bãi</div>
                      </div>
                    )}
                    {activeVisit.gateInAt && (
                      <div className="relative">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 absolute -left-[21px] top-1"></div>
                        <div className="font-bold text-slate-800">Tiếp nhận vào cổng (Gate-in)</div>
                        <div className="text-slate-500">
                          {new Date(activeVisit.gateInAt).toLocaleString('vi-VN')}
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <div className="w-2.5 h-2.5 rounded-full bg-slate-400 absolute -left-[21px] top-1"></div>
                      <div className="font-bold text-slate-800">Khai báo Manifest</div>
                      <div className="text-slate-500">{activeVisit.manifestNo}</div>
                    </div>
                  </div>
                </div>
              )}
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
              Tạo Container Visit thủ công
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
                    {...validation.props('containers-cv-form-container-number')}
                    type="text"
                    value={cvForm.containerNumber}
                    onChange={(e) =>
                      setCvForm({ ...cvForm, containerNumber: e.target.value.toUpperCase() })
                    }
                    placeholder="Ví dụ: MSCU1234567"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono"
                  />
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
                      <option value="20GP">20GP</option>
                      <option value="40GP">40GP</option>
                      <option value="40HC">40HC</option>
                      <option value="20RF">20RF</option>
                      <option value="45HC">45HC</option>
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
                  Tạo Container Visit
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
