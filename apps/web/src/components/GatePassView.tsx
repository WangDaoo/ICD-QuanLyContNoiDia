import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useApp } from '../context/AppContext';

import { GatePass } from '../types';
import { QrCode, LogOut, CheckCircle2, AlertCircle, Send, Plus, Search, Scan, Printer } from 'lucide-react';
import { NavTabId } from './Sidebar';
import { useBackendReadiness } from './useBackendReadiness';
import { CriticalDataNotice } from './CriticalDataNotice';

import { useCommandAction, CommandNotice } from './useCommandAction';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState } from './CollectionState';
import { effectiveGatePassStatus, gatePassStatusMessage } from '../lib/gate-pass';
import { ReadinessNotice } from './ReadinessNotice';
import { useGatePassExpiry } from './useGatePassExpiry';
import { ConfirmDialog } from './ConfirmDialog';
import { SearchableSelect } from './SearchableSelect';
import type { PickerOption } from './SearchableSelect';
import { businessLabel } from '../lib/business-labels';
import { formatVietnamDateTime } from '../lib/time';

/** Format seconds as HH:MM:SS */
function formatCountdown(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface GatePassViewProps {
  targetGatePassId?: string;
  targetAction?: 'create';
  onNavigate: (tab: NavTabId, contextId?: string) => void;
  targetVisitId?: string;
}

export const GatePassView: React.FC<GatePassViewProps> = ({
  onNavigate,
  targetVisitId,
  targetGatePassId,
  targetAction,
}) => {
  const {
    currentUser,
    gatePasses,
    containerVisits,
    scanAndGateOut,
    createGatePass,
    cancelGatePass,
  } = useApp();

  const can = (permission: string) =>
    currentUser.permissionCodes?.some((code) => code === '*' || code === permission) ?? false;
  const action = useCommandAction();
  const now = useGatePassExpiry(gatePasses);
  const validation = useFormValidation();
  const [searchTerm, setSearchTerm] = useViewQueryState('gate-pass', 'search', '');
  const [selectedGatePassId, setSelectedGatePassId] = useViewQueryState(
    'gate-pass',
    'selection',
    targetGatePassId || gatePasses[0]?.id || '',
  );
  const selectedGatePass = gatePasses.find((g) => g.id === selectedGatePassId) || null;
  const selectedStatus = selectedGatePass ? effectiveGatePassStatus(selectedGatePass, now) : null;
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Confirm gate-out dialog state
  const [pendingGateOutPass, setPendingGateOutPass] = useState<GatePass | null>(null);
  // Confirm cancel dialog state
  const [pendingCancelPass, setPendingCancelPass] = useState<GatePass | null>(null);
  // Success banner after gate-out
  const [gateOutSuccessMsg, setGateOutSuccessMsg] = useState<string | null>(null);

  // Live countdown for ACTIVE gate pass
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  useEffect(() => {
    if (selectedStatus !== 'ACTIVE') return;
    const interval = setInterval(() => setCountdownNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [selectedStatus]);

  // Tra cứu phiếu từ dữ liệu backend; xác nhận Gate-out là command riêng.
  const [scannerInput, setScannerInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Issue Form state
  const eligibleContainers = containerVisits.filter((c) =>
    ['IN_YARD', 'STRIPPED', 'UNDER_INSPECTION', 'IN_STRIPPING'].includes(c.state),
  );
  const [issueVisitId, setIssueVisitId] = useState(targetVisitId || '');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverCccd, setReceiverCccd] = useState('');
  const evaluation = useBackendReadiness(showIssueModal ? issueVisitId : null);

  // Container picker options
  const containerOptions: PickerOption[] = eligibleContainers.map((c) => ({
    value: c.id,
    label: c.containerNumber,
    description: `${c.consigneeName} · ${c.currentLocation}`,
    keywords: `${c.containerNumber} ${c.consigneeName}`,
  }));

  useEffect(() => {
    if (
      !targetGatePassId &&
      targetAction === 'create' &&
      targetVisitId &&
      can('gate_pass.create')
    ) {
      setIssueVisitId(targetVisitId);
      setShowIssueModal(true);
    }
  }, [targetVisitId, targetGatePassId, targetAction]);
  useEffect(() => {
    if (!selectedGatePassId && gatePasses.length) setSelectedGatePassId(gatePasses[0].id);
  }, [gatePasses, selectedGatePassId]);

  useEffect(() => {
    if (targetGatePassId) setSelectedGatePassId(targetGatePassId);
  }, [targetGatePassId]);

  const filteredPasses = gatePasses.filter(
    (gp) =>
      gp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gp.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gp.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleIssueGatePass = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (
      !can('gate_pass.create') ||
      action.isPending() ||
      !validation.validate(e.currentTarget) ||
      evaluation.status !== 'ready'
    )
      return;

    const res = await action.run(() =>
      createGatePass({
        visitId: issueVisitId,
        vehiclePlate,
        receiverName,
        receiverIdNumber: receiverCccd,
      }),
    );

    if (res?.success && res.gatePass) {
      setSelectedGatePassId(res.gatePass.id);
      setShowIssueModal(false);
    }
  };

  const handleFindPass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerInput.trim()) return;

    const target = gatePasses.find(
      (gp) =>
        gp.qrToken.toLowerCase() === scannerInput.trim().toLowerCase() ||
        gp.code.toLowerCase() === scannerInput.trim().toLowerCase(),
    );

    if (!target) {
      setScanResult({
        success: false,
        message: 'Không tìm thấy Phiếu ra cổng nào khớp với mã quét!',
      });
      return;
    }

    setSelectedGatePassId(target.id);
    const statusLabel = businessLabel('gatePassStatus', effectiveGatePassStatus(target));
    setScanResult({
      success: true,
      message: `Tìm thấy phiếu ${target.code} · Cont: ${target.containerNumber} · Trạng thái: ${statusLabel}. Hệ thống kiểm tra điều kiện khi xác nhận ra cổng.`,
    });
  };

  /** Step 1: show confirmation dialog before gate-out */
  const handleConfirmExit = (pass: GatePass) => {
    if (!can('gate_pass.use') || effectiveGatePassStatus(pass) !== 'ACTIVE') return;
    setPendingGateOutPass(pass);
  };

  /** Step 2: user confirmed in dialog — execute the command */
  const handleActualGateOut = async () => {
    if (!pendingGateOutPass) return;
    const pass = pendingGateOutPass;
    // Keep dialog mounted during the async call so it can show pending/error state.
    const res = await action.run(() => scanAndGateOut(pass.qrToken || pass.code));
    setPendingGateOutPass(null);
    if (res?.success) {
      setSelectedGatePassId(pass.id);
      const timeStr = new Date().toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
      setGateOutSuccessMsg(
        `Ra cổng thành công: ${pass.containerNumber} · Xe ${pass.vehiclePlate} · Tài xế ${pass.receiverName} · ${timeStr}`,
      );
    }
  };

  /** Show cancel dialog */
  const handleCancelGatePass = (pass: GatePass) => {
    if (!can('gate_pass.create')) return;
    setPendingCancelPass(pass);
  };

  /** Execute cancel after dialog confirmation */
  const handleActualCancel = async (reason: string) => {
    if (!pendingCancelPass) return;
    const pass = pendingCancelPass;
    // Keep dialog mounted during the async call so it can show pending/error state.
    await action.run(() => cancelGatePass(pass.id, reason));
    setPendingCancelPass(null);
  };

  // Compute seconds remaining for countdown
  const secondsLeft =
    selectedStatus === 'ACTIVE' && selectedGatePass
      ? Math.max(0, Math.floor((new Date(selectedGatePass.expiresAt).getTime() - countdownNow) / 1000))
      : null;

  // Expiry hint for issue form: now + 24h
  const expiryHintStr = new Date(Date.now() + 24 * 60 * 60 * 1000).toLocaleString('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="space-y-6">
      <CriticalDataNotice kind="gatePasses" />
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <span>Phiếu ra cổng & Kiểm soát Xuất bãi</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Phát hành mã QR Code ra cổng có thời hạn 24 giờ, đối soát cổng ra và xác nhận xe xuất bãi
          </p>
        </div>

        {can('gate_pass.create') && (
          <button
            onClick={() => {
              action.clear();
              setShowIssueModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Cấp Phiếu ra cổng mới</span>
          </button>
        )}
      </div>

      {/* Success banner after gate-out */}
      {gateOutSuccessMsg && (
        <div className="p-3 rounded-lg text-xs font-semibold flex items-center justify-between space-x-2 bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{gateOutSuccessMsg}</span>
          </span>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setGateOutSuccessMsg(null)}
            className="shrink-0 text-emerald-600 hover:text-emerald-800 font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Tra cứu mã phiếu */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-100">Tra cứu phiếu ra cổng</div>
            <div className="text-slate-400 text-caption">
              Quét mã QR từ app tài xế hoặc nhập mã GP-XXXX để xác thực
            </div>
          </div>
        </div>

        <form onSubmit={handleFindPass} className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Nhập mã QR hoặc mã GP-XXXX..."
            aria-label="Mã QR hoặc mã Phiếu ra cổng"
            value={scannerInput}
            onChange={(e) => setScannerInput(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs w-64 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition"
          >
            Quét mã
          </button>
        </form>
      </div>

      {scanResult && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center space-x-2 ${
            scanResult.success
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {scanResult.success ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{scanResult.message}</span>
        </div>
      )}

      {!showIssueModal && <CommandNotice notice={action.notice} />}
      {/* Main Grid: Gate Passes list & Pass QR Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Passes List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm mã GP, số cont, biển số xe..."
              aria-label="Tìm Phiếu ra cổng"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <CollectionState
              resource="gatePasses"
              count={filteredPasses.length}
              total={gatePasses.length}
              filtered={!!searchTerm}
              onClear={() => setSearchTerm('')}
            />
            {filteredPasses.map((gp) => {
              const isSelected = selectedGatePass?.id === gp.id;
              const effectiveStatus = effectiveGatePassStatus(gp, now);
              const statusLabel = businessLabel('gatePassStatus', effectiveStatus);
              return (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  key={gp.id}
                  onClick={() => setSelectedGatePassId(gp.id)}
                  className={`block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-indigo-50/60 border-indigo-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="block flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-indigo-700">{gp.code}</span>
                    <span
                      className={`px-2 py-1 text-caption font-bold rounded-full ${
                        effectiveStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : gp.status === 'USED'
                            ? 'bg-slate-200 text-slate-700'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {statusLabel}
                    </span>
                  </span>
                  <span className="block font-mono font-bold text-slate-800 text-xs mt-1">
                    {gp.containerNumber}
                  </span>
                  <span className="block text-caption text-slate-500 mt-1 flex justify-between">
                    <span>Xe: {gp.vehiclePlate}</span>
                    <span>Tài xế: {gp.receiverName}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Gate Pass Detail & Gate-out */}
        <div className="lg:col-span-2">
          {selectedGatePass ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold font-mono text-slate-900">
                      {selectedGatePass.code}
                    </h3>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedStatus === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedGatePass.status === 'USED'
                            ? 'bg-slate-200 text-slate-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {businessLabel('gatePassStatus', selectedStatus ?? 'UNKNOWN')}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-1">
                    Phát hành lúc: {formatVietnamDateTime(selectedGatePass.issuedAt)}
                  </p>
                </div>

                <div className="text-right space-y-1">
                  <div>
                    <span className="text-slate-400">Hiệu lực đến: </span>
                    <span className="font-bold text-slate-800">
                      {new Date(selectedGatePass.expiresAt).toLocaleString('vi-VN', {
                        timeZone: 'Asia/Ho_Chi_Minh',
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  {secondsLeft !== null && (
                    <div
                      className={`font-bold font-mono text-sm ${
                        secondsLeft < 3600 ? 'text-rose-700' : 'text-emerald-700'
                      }`}
                      aria-live="polite"
                      aria-label={`Còn hiệu lực: ${formatCountdown(secondsLeft)}`}
                    >
                      Còn hiệu lực: {formatCountdown(secondsLeft)}
                    </div>
                  )}
                </div>
              </div>

              {/* QR Code Presentation Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block shadow-xs">
                  {selectedStatus === 'ACTIVE' && selectedGatePass.qrToken ? (
                    <QRCode
                      value={selectedGatePass.qrToken}
                      size={160}
                      data-testid="gate-pass-qr"
                    />
                  ) : (
                    <p>QR chỉ hiển thị với phiếu còn hiệu lực và tài khoản có quyền phát hành.</p>
                  )}
                </div>
                {selectedStatus === 'ACTIVE' && (
                  <div>
                    <div className="font-mono font-bold text-indigo-700 text-sm">
                      {selectedGatePass.code}
                    </div>
                    <div className="text-slate-500 text-caption mt-1">
                      Tài xế quét QR từ app di động hoặc nhân viên cổng nhập mã{' '}
                      <span className="font-mono font-semibold">{selectedGatePass.code}</span>
                    </div>
                  </div>
                )}
                <div className="text-slate-600 max-w-sm mx-auto">
                  {selectedStatus && gatePassStatusMessage(selectedStatus)}
                </div>
              </div>

              {/* Vehicle & Receiver verification */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800">Thông tin Phương tiện</div>
                  <div>
                    Biển số đăng ký:{' '}
                    <strong className="font-mono">{selectedGatePass.vehiclePlate}</strong>
                  </div>
                  <div>
                    Người nhận hàng: <strong>{selectedGatePass.receiverName}</strong>
                  </div>
                  <div>
                    Số CMND/CCCD:{' '}
                    <strong className="font-mono">{selectedGatePass.receiverIdNumber}</strong>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-800">Hồ sơ Container</div>
                  <div>
                    Số container:{' '}
                    <strong className="font-mono text-indigo-700">
                      {selectedGatePass.containerNumber}
                    </strong>
                  </div>
                  {selectedGatePass.consigneeName && (
                    <div>
                      Chủ hàng: <strong>{selectedGatePass.consigneeName}</strong>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => onNavigate('containers', selectedGatePass.containerVisitId)}
                    className="text-indigo-600 underline hover:text-indigo-800 text-caption"
                  >
                    Xem chi tiết container →
                  </button>
                  <div className="text-slate-500">
                    Hệ thống tự kiểm tra điều kiện xuất cổng khi xác nhận.
                  </div>
                </div>
              </div>

              {/* Gate-out Action */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div className="text-slate-500">
                  {selectedStatus && gatePassStatusMessage(selectedStatus)}
                </div>

                {selectedStatus === 'ACTIVE' ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Print button */}
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="px-4 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition flex items-center space-x-2"
                      title="In phiếu ra cổng"
                    >
                      <Printer className="w-4 h-4" />
                      <span>In Phiếu</span>
                    </button>

                    {can('gate_pass.create') && (
                      <button
                        disabled={action.pending}
                        onClick={() => handleCancelGatePass(selectedGatePass)}
                        className="px-4 py-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition"
                      >
                        Huỷ phiếu
                      </button>
                    )}
                    {can('gate_pass.use') && (
                      <button
                        disabled={action.pending}
                        onClick={() => handleConfirmExit(selectedGatePass)}
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center space-x-2 transition"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Xác nhận Ra cổng</span>
                      </button>
                    )}
                  </div>
                ) : selectedStatus === 'USED' && can('handover.read') ? (
                  <button
                    onClick={() => onNavigate('handovers')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center space-x-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Tiến hành bàn giao vận chuyển</span>
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Chọn một Phiếu ra cổng bên trái để xem chi tiết mã QR
            </div>
          )}
        </div>
      </div>

      {/* Issue Modal */}
      {showIssueModal && (
        <ModalOverlay
          aria-labelledby="gate-pass-dialog-1-title"
          pending={action.pending}
          onClose={() => {
            if (!action.isPending()) setShowIssueModal(false);
          }}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        >
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="gate-pass-dialog-1-title" className="text-base font-bold text-slate-900 mb-2">
              Phát hành Phiếu ra cổng
            </h3>
            <p className="text-slate-500 mb-4">
              Chọn container để kiểm tra hồ sơ, thanh toán và lệnh giữ trước khi phát hành.
            </p>

            <form noValidate onSubmit={handleIssueGatePass} className="space-y-4">
              <FormErrors errors={validation.errors} />
              <CommandNotice notice={action.notice} />
              <fieldset disabled={action.pending} className="space-y-4">
                <div>
                  {eligibleContainers.length === 0 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg">
                      Chưa có container trong bãi để kiểm tra.
                    </div>
                  ) : (
                    <SearchableSelect
                      id="gate-pass-issue-visit-id"
                      label="Container trong bãi*"
                      options={containerOptions}
                      value={issueVisitId}
                      onChange={setIssueVisitId}
                      placeholder="Nhập số container hoặc tên chủ hàng…"
                      required
                      emptyText="Không tìm thấy container phù hợp"
                      hint="Chỉ hiện container đang trong bãi chờ xuất"
                    />
                  )}
                </div>

                <ReadinessNotice
                  evaluation={evaluation}
                  resolveBlocker={(code) => {
                    if (!issueVisitId) return null;
                    if (['NO_BILLING', 'BILLING_INCOMPLETE', 'UNBILLED_SERVICES', 'BILLING_CONFIGURATION_MISSING'].includes(code)) {
                      return { label: 'Mở Thanh toán', onClick: () => { setShowIssueModal(false); onNavigate('billing', issueVisitId); } };
                    }
                    if (['CONTAINER_NOT_IN_YARD', 'NO_YARD_POSITION', 'ACTIVE_YARD_OPERATION'].includes(code)) {
                      return { label: 'Xem vị trí bãi', onClick: () => { setShowIssueModal(false); onNavigate('yard', issueVisitId); } };
                    }
                    if (code === 'INSPECTION_HOLD') {
                      return { label: 'Xem kiểm hóa', onClick: () => { setShowIssueModal(false); onNavigate('containers', issueVisitId); } };
                    }
                    if (code === 'OPERATIONAL_HOLD') {
                      return { label: 'Xem lệnh giữ', onClick: () => { setShowIssueModal(false); onNavigate('containers', issueVisitId); } };
                    }
                    return null;
                  }}
                />

                <div>
                  <label
                    htmlFor="gate-pass-receiver-vehicle-plate"
                    className="block font-semibold text-slate-700 mb-1"
                  >
                    Biển số xe nhận hàng*
                  </label>
                  <input
                    id="gate-pass-receiver-vehicle-plate"
                    {...validation.props('gate-pass-receiver-vehicle-plate')}
                    type="text"
                    required
                    value={vehiclePlate}
                    aria-label="Biển số xe nhận hàng"
                    onChange={(e) => setVehiclePlate(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="gate-pass-receiver-name"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Tên tài xế / Người nhận*
                    </label>
                    <input
                      id="gate-pass-receiver-name"
                      type="text"
                      required
                      value={receiverName}
                      aria-label="Tên tài xế / Người nhận"
                      onChange={(e) => setReceiverName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="gate-pass-receiver-cccd"
                      className="block font-semibold text-slate-700 mb-1"
                    >
                      Số CMND / CCCD*
                    </label>
                    <input
                      id="gate-pass-receiver-cccd"
                      type="text"
                      required
                      value={receiverCccd}
                      aria-label="Số CMND / CCCD"
                      onChange={(e) => setReceiverCccd(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>
                </div>
              </fieldset>
              <p className="text-slate-500 text-caption">
                Phiếu có hiệu lực 24 giờ kể từ thời điểm phát hành (đến{' '}
                <strong>{expiryHintStr}</strong> nếu phát hành ngay bây giờ).
              </p>
              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  disabled={action.pending}
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={action.pending || evaluation.status !== 'ready'}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  Phát hành & Sinh mã QR
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}

      {/* Gate-out confirmation dialog */}
      {pendingGateOutPass && (
        <ConfirmDialog
          title="Xác nhận xe ra cổng"
          message="Thao tác này không thể hoàn tác. Container sẽ chuyển sang trạng thái Đã ra cổng và phiếu sẽ bị đánh dấu Đã sử dụng."
          summary={[
            { label: 'Số container', value: <span className="font-mono">{pendingGateOutPass.containerNumber}</span> },
            { label: 'Biển số xe', value: <span className="font-mono">{pendingGateOutPass.vehiclePlate}</span> },
            { label: 'Tài xế / Người nhận', value: pendingGateOutPass.receiverName },
            { label: 'Số CMND/CCCD', value: <span className="font-mono">{pendingGateOutPass.receiverIdNumber}</span> },
            { label: 'Mã phiếu', value: <span className="font-mono">{pendingGateOutPass.code}</span> },
          ]}
          confirmLabel="Xác nhận Ra cổng"
          cancelLabel="Quay lại kiểm tra"
          tone="primary"
          pending={action.pending}
          notice={action.notice}
          onConfirm={handleActualGateOut}
          onClose={() => setPendingGateOutPass(null)}
        />
      )}

      {/* Cancel gate pass confirmation dialog */}
      {pendingCancelPass && (
        <ConfirmDialog
          title="Huỷ Phiếu ra cổng"
          message={`Phiếu ${pendingCancelPass.code} sẽ bị huỷ và không thể dùng để ra cổng nữa.`}
          summary={[
            { label: 'Số container', value: <span className="font-mono">{pendingCancelPass.containerNumber}</span> },
            { label: 'Biển số xe', value: <span className="font-mono">{pendingCancelPass.vehiclePlate}</span> },
            { label: 'Tài xế / Người nhận', value: pendingCancelPass.receiverName },
          ]}
          reason={{
            label: 'Lý do huỷ phiếu',
            placeholder: 'Nhập lý do huỷ (ví dụ: xe sai biển số, chủ hàng yêu cầu huỷ...)',
            minLength: 10,
          }}
          confirmLabel="Xác nhận Huỷ"
          cancelLabel="Không huỷ"
          tone="danger"
          pending={action.pending}
          notice={action.notice}
          onConfirm={handleActualCancel}
          onClose={() => setPendingCancelPass(null)}
        />
      )}
    </div>
  );
};
