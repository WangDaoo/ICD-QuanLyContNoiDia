import { ModalOverlay } from './ModalOverlay';
import React, { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { useApp } from '../context/AppContext';
import { readinessLabel } from '../services/readiness-labels';
import { GatePass, ContainerVisit } from '../types';
import {
  QrCode,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Plus,
  Search,
  Scan,
  ShieldCheck,
  Truck,
  ExternalLink,
} from 'lucide-react';
import { NavTabId } from './Sidebar';
import { useBackendReadiness } from './useBackendReadiness';

interface GatePassViewProps {
  onNavigate: (tab: NavTabId, contextId?: string) => void;
  targetVisitId?: string;
}

export const GatePassView: React.FC<GatePassViewProps> = ({ onNavigate, targetVisitId }) => {
  const {
    gatePasses,
    containerVisits,
    scanAndGateOut,
    createGatePass,
    cancelGatePass,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGatePassId, setSelectedGatePassId] = useState<string | null>(gatePasses[0]?.id || null);
  const selectedGatePass = gatePasses.find((g) => g.id === selectedGatePassId) || null;
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Tra cứu phiếu từ dữ liệu backend; xác nhận Gate-out là command riêng.
  const [scannerInput, setScannerInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Issue Form state
  const eligibleContainers = containerVisits.filter(
    (c) => ['IN_YARD', 'STRIPPED', 'UNDER_INSPECTION', 'IN_STRIPPING'].includes(c.state)
  );
  const [issueVisitId, setIssueVisitId] = useState(targetVisitId || '');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [receiverCccd, setReceiverCccd] = useState('');
  const { readiness, readinessError, isCheckingReadiness } = useBackendReadiness(showIssueModal ? issueVisitId : null);

  useEffect(() => {
    if (targetVisitId) { setIssueVisitId(targetVisitId); setShowIssueModal(true); }
  }, [targetVisitId]);
  useEffect(() => {
    if (!selectedGatePassId && gatePasses.length) setSelectedGatePassId(gatePasses[0].id);
  }, [gatePasses, selectedGatePassId]);

  const filteredPasses = gatePasses.filter(
    (gp) =>
      gp.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gp.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gp.vehiclePlate.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleIssueGatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueVisitId) return;

    const res = await createGatePass({
      visitId: issueVisitId,
      vehiclePlate,
      receiverName,
      receiverIdNumber: receiverCccd,
    });

    alert(res.message);
    if (res.success && res.gatePass) {
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
        gp.code.toLowerCase() === scannerInput.trim().toLowerCase()
    );

    if (!target) {
      setScanResult({
        success: false,
        message: 'Không tìm thấy Phiếu ra cổng nào khớp với mã quét!',
      });
      return;
    }

    setSelectedGatePassId(target.id);
    setScanResult({
      success: true,
      message: `Tìm thấy phiếu ${target.code} (${target.containerNumber}) · ${target.status}. Backend kiểm tra lại khi xác nhận ra cổng.`,
    });
  };

  const handleConfirmExit = async (pass: GatePass) => {
    const res = await scanAndGateOut(pass.code);
    alert(res.message);
    if (res.success) {
      setSelectedGatePassId(pass.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <QrCode className="w-5 h-5 text-indigo-600" />
            <span>Phiếu ra cổng (Gate Pass) & Kiểm soát Xuất kho</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Phát hành mã QR Code ra cổng có thời hạn 24 giờ, đối soát cổng Outbound và xác nhận Gate-out
          </p>
        </div>

        <button
          onClick={() => setShowIssueModal(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shadow-xs flex items-center space-x-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Cấp Phiếu ra cổng mới</span>
        </button>
      </div>

      {/* Tra cứu mã phiếu */}
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0">
            <Scan className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-slate-100">Tra cứu phiếu ra cổng</div>
            <div className="text-slate-400 text-[11px]">Quét mã QR từ app tài xế hoặc nhập mã GP-XXXX để xác thực</div>
          </div>
        </div>

        <form onSubmit={handleFindPass} className="flex items-center space-x-2">
          <input
            type="text"
            placeholder="Nhập mã QR Token hoặc GP Code..."
            value={scannerInput}
            onChange={(e) => setScannerInput(e.target.value)}
            className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs w-64 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg transition"
          >
            Quét mã
          </button>
        </form>
      </div>

      {scanResult && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center space-x-2 ${
            scanResult.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {scanResult.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          <span>{scanResult.message}</span>
        </div>
      )}

      {/* Main Grid: Gate Passes list & Pass QR Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Passes List */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Tìm mã GP, số cont, biển số xe..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="space-y-2">
            {filteredPasses.map((gp) => {
              const isSelected = selectedGatePass?.id === gp.id;
              const isExpired = new Date(gp.expiresAt).getTime() < Date.now();
              return (
                <button type="button" aria-pressed={isSelected}
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
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        gp.status === 'ACTIVE' && !isExpired
                          ? 'bg-emerald-100 text-emerald-800'
                          : gp.status === 'USED'
                          ? 'bg-slate-200 text-slate-700'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isExpired && gp.status === 'ACTIVE' ? 'EXPIRED' : gp.status}
                    </span>
                  </span>
                  <span className="block font-mono font-bold text-slate-800 text-xs mt-1">{gp.containerNumber}</span>
                  <span className="block text-[11px] text-slate-500 mt-1 flex justify-between">
                    <span>Xe: {gp.vehiclePlate}</span>
                    <span>Tài xế: {gp.receiverName}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right 2 Columns: Gate Pass Inspection & Gate-out Execution */}
        <div className="lg:col-span-2">
          {selectedGatePass ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-bold font-mono text-slate-900">{selectedGatePass.code}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        selectedGatePass.status === 'ACTIVE'
                          ? 'bg-emerald-100 text-emerald-800'
                          : selectedGatePass.status === 'USED'
                          ? 'bg-slate-200 text-slate-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {selectedGatePass.status}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Phát hành lúc: {new Date(selectedGatePass.issuedAt).toLocaleString('vi-VN')}
                  </p>
                </div>

                <div className="text-right">
                  <span className="text-slate-400">Hiệu lực đến:</span>
                  <div className="font-bold text-slate-800">
                    {new Date(selectedGatePass.expiresAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>

              {/* QR Code Presentation Box */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center space-y-3">
                <div className="bg-white p-4 rounded-xl border border-slate-200 inline-block shadow-xs">
                  {selectedGatePass.qrToken ? <QRCode value={selectedGatePass.qrToken} size={160} /> : <p>QR chỉ hiển thị với phiếu còn hiệu lực và tài khoản có quyền phát hành.</p>}
                </div>
                <div className="font-mono text-slate-500 font-semibold break-all text-[10px] max-w-full">{selectedGatePass.qrToken}</div>
                <div className="text-slate-600 max-w-sm mx-auto">
                  Trình mã này tại cổng Outbound để nhân viên đối soát biển số xe và mở barie.
                </div>
              </div>

              {/* Vehicle & Receiver verification */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">Thông tin Phương tiện</div>
                  <div>Biển số đăng ký: <strong className="font-mono">{selectedGatePass.vehiclePlate}</strong></div>
                  <div>Người nhận hàng: <strong>{selectedGatePass.receiverName}</strong></div>
                  <div>Số CMND/CCCD: <strong className="font-mono">{selectedGatePass.receiverIdNumber}</strong></div>
                </div>

                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">Hồ sơ Container</div>
                  <div>Số container: <strong className="font-mono text-indigo-700">{selectedGatePass.containerNumber}</strong></div>
                  <div>Mã chuyến tiếp nhận: <strong className="font-mono text-slate-600">{selectedGatePass.containerVisitId}</strong></div>
                  <div className="text-slate-500">Điều kiện được backend kiểm tra lại khi xác nhận ra cổng.</div>
                </div>
              </div>

              {/* Gate-out Action */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="text-slate-500">
                  {selectedGatePass.status === 'ACTIVE'
                    ? 'Nhân viên bảo vệ kiểm tra xong biển số và số chì có thể xác nhận cho xe ra.'
                    : 'Phiếu này đã được sử dụng để xuất cổng.'}
                </div>

                {selectedGatePass.status === 'ACTIVE' ? (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={async () => {
                        const reason = window.prompt('Lý do hủy Gate Pass:');
                        if (reason) alert((await cancelGatePass(selectedGatePass.id, reason)).message);
                      }}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg border border-rose-200 transition"
                    >
                      Hủy Gate Pass
                    </button>
                    <button
                      onClick={() => handleConfirmExit(selectedGatePass)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm flex items-center space-x-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Xác nhận Ra cổng (Gate-out)</span>
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => onNavigate('handovers')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Tiến hành bàn giao vận chuyển</span>
                  </button>
                )}
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
        <ModalOverlay aria-labelledby="gate-pass-dialog-1-title" onClose={() => setShowIssueModal(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
            <h3 id="gate-pass-dialog-1-title" className="text-base font-bold text-slate-900 mb-2">Phát hành Phiếu ra cổng (Gate Pass)</h3>
            <p className="text-slate-500 mb-4">
              Chọn container để kiểm tra hồ sơ, thanh toán và lệnh giữ từ backend trước khi phát hành.
            </p>

            <form onSubmit={handleIssueGatePass} className="space-y-4">
              <div>
                <label htmlFor="gate-pass-issue-visit-id" className="block font-semibold text-slate-700 mb-1">Chọn container trong bãi*</label>
                {eligibleContainers.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-lg">
                    Chưa có container trong bãi để kiểm tra.
                  </div>
                ) : (
                  <select id="gate-pass-issue-visit-id"
                    value={issueVisitId}
                    onChange={(e) => setIssueVisitId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold bg-white"
                  >
                    <option value="">Chọn container…</option>
                    {eligibleContainers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.containerNumber} — {c.consigneeName} ({c.currentLocation})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {isCheckingReadiness && <p role="status" className="text-slate-500">Đang kiểm tra điều kiện ra cổng…</p>}
              {readinessError && <p role="alert" className="text-rose-700">{readinessError}</p>}
              {readiness && (readiness.blockers.length ? <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900"><strong>Điều kiện chưa đạt:</strong><ul className="list-disc pl-4 mt-1">{readiness.blockers.map((blocker, index) => <li key={index}>{readinessLabel(blocker)}</li>)}</ul></div> : <p className="text-emerald-700">Đạt điều kiện từ backend. Hệ thống sẽ kiểm tra lại khi phát hành.</p>)}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Biển số xe nhận hàng*</label>
                <input
                  type="text"
                  required
                  value={vehiclePlate}
                  aria-label="Biển số xe nhận hàng"
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tên tài xế / Người nhận*</label>
                  <input
                    type="text"
                    required
                    value={receiverName}
                    aria-label="Tên tài xế / Người nhận"
                    onChange={(e) => setReceiverName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Số CMND / CCCD*</label>
                  <input
                    type="text"
                    required
                    value={receiverCccd}
                    aria-label="Số CMND / CCCD"
                    onChange={(e) => setReceiverCccd(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!readiness || readiness.blockers.length > 0 || isCheckingReadiness}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50"
                >
                  Phát hành & Sinh mã QR
                </button>
              </div>
            </form>
          </div>
        </ModalOverlay>
      )}
    </div>
  );
};
