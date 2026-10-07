import { ModalOverlay } from './ModalOverlay';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PartnerApiClient, PartnerApiLog } from '../types';
import { formatRedactedLogBody } from '../services/redacted-log-body';
import {
  KeyRound,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  Plus,
  Copy,
  Check,
  RotateCw,
  Terminal,
} from 'lucide-react';

interface PartnerManagementViewProps {
  mode: 'CLIENTS' | 'LOGS';
}

export const PartnerManagementView: React.FC<PartnerManagementViewProps> = ({ mode }) => {
  const { partnerClients, partnerApiLogs, rotatePartnerApiKey, createPartnerClient } = useApp();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<PartnerApiLog | null>(partnerApiLogs[0] || null);

  // New partner state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newApiKeyResult, setNewApiKeyResult] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(text);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch { alert('Không thể sao chép. Vui lòng chọn và sao chép khóa thủ công.'); }
  };

  const handleRotateKey = async (client: PartnerApiClient) => {
    const res = await rotatePartnerApiKey(client.id);
    if (!res.success || !res.plainApiKey) { alert(res.message); return; }
    alert(`Đã thu hồi API key cũ và cấp API key mới cho ${client.partnerName}:\n\n${res.plainApiKey}\n\n(Lưu ý: Khóa chỉ hiển thị một lần duy nhất)`);
  };

  const handleCreatePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) return;
    const res = await createPartnerClient(newCode.trim().toUpperCase(), newName.trim(), ['read:handovers', 'write:confirmations']);
    if (res.success && res.plainApiKey) setNewApiKeyResult(res.plainApiKey);
    else alert(res.message);
  };

  if (mode === 'CLIENTS') {
    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <span>Đối tác Tích hợp API Vận chuyển (Mô đun 13)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý API Key, phân quyền phạm vi (Scopes), cơ chế xoay vòng khóa bí mật (Rotation) và mã băm SHA-256 an toàn
            </p>
          </div>

          <button
            onClick={() => {
              setNewApiKeyResult(null);
              setNewCode('');
              setNewName('');
              setShowAddModal(true);
            }}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Đối tác API mới</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {partnerClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-indigo-300 transition"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{client.partnerName}</div>
                  <span className="font-mono text-indigo-700 font-semibold">{client.partnerCode}</span>
                </div>
                <span
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                    client.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {client.status}
                </span>
              </div>

              <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Masked API Key:</span>
                  <span className="font-mono text-slate-700 font-bold">
                    icd_live_••••••••••••{client.keyLast4}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Băm SHA-256:</span>
                  <span className="font-mono text-slate-500 max-w-[180px] truncate" title={client.apiKeyHash}>
                    {client.apiKeyHash}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Quyền (Scopes):</span>
                  <div className="flex flex-wrap gap-1">
                    {client.scopes.map((s) => (
                      <span key={s} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[10px] font-mono">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-semibold">Yêu cầu gần nhất:</span>
                  <span className="text-slate-700 font-medium">
                    {client.lastRequestAt ? new Date(client.lastRequestAt).toLocaleString('vi-VN') : 'Chưa có cuộc gọi nào'}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  onClick={() => handleRotateKey(client)}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center space-x-1.5 transition"
                >
                  <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Xoay vòng Khóa (Rotate Key)</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {showAddModal && (
          <ModalOverlay aria-labelledby="partner-management-dialog-1-title" onClose={() => setShowAddModal(false)} className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
              <h3 id="partner-management-dialog-1-title" className="text-base font-bold text-slate-900 mb-2">Đăng ký Đối tác Tích hợp API mới</h3>

              {newApiKeyResult ? (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800">
                    Đối tác đã được tạo thành công! Hãy copy API Key dưới đây và cung cấp an toàn cho đối tác:
                  </div>
                  <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg break-all">
                    {newApiKeyResult}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                    >
                      Hoàn tất
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreatePartner} className="space-y-4">
                  <div>
                    <label htmlFor="partner-management-new-code" className="block font-semibold text-slate-700 mb-1">Mã đối tác (Partner Code)*</label>
                    <input id="partner-management-new-code"
                      type="text"
                      required
                      placeholder="VD: TRANS_EXPRESS"
                      value={newCode}
                      onChange={(e) => setNewCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor="partner-management-new-name" className="block font-semibold text-slate-700 mb-1">Tên công ty đối tác*</label>
                    <input id="partner-management-new-name"
                      type="text"
                      required
                      placeholder="VD: Công ty TNHH Vận tải Toàn Cầu"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700"
                    >
                      Tạo & Cấp API Key
                    </button>
                  </div>
                </form>
              )}
            </div>
          </ModalOverlay>
        )}
      </div>
    );
  }

  // mode === 'LOGS'
  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <FileCode className="w-5 h-5 text-indigo-600" />
            <span>Nhật ký API Đối tác (Partner Integration Logs)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Giám sát thời gian thực các cuộc gọi API từ đối tác: Accept chuyến, Xác nhận giao kho, Upload POD, Tọa độ GPS
          </p>
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-lg font-semibold">
          {partnerApiLogs.length} cuộc gọi API đã ghi nhận
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Logs list */}
        <div className="space-y-2">
          {partnerApiLogs.map((log) => {
            const isSelected = selectedLog?.id === log.id;
            return (
              <div
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className={`p-3.5 rounded-xl border cursor-pointer transition text-xs ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-mono font-bold rounded text-[10px]">
                    {log.method}
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      log.httpStatus === 200 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    HTTP {log.httpStatus}
                  </span>
                </div>
                <div className="font-mono text-slate-800 font-semibold mt-1 truncate">{log.endpoint}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                  <span>Đối tác: <strong className="text-slate-700">{log.partnerName}</strong></span>
                  <span>{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 2 Columns: Payload inspector */}
        <div className="lg:col-span-2">
          {selectedLog ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white font-mono font-bold rounded">
                    {selectedLog.method}
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedLog.endpoint}</span>
                </div>
                <span className="text-slate-400 font-mono">Độ trễ: {selectedLog.latencyMs}ms</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Request Body (Đã che giấu thông tin nhạy cảm)
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto max-h-64 whitespace-pre-wrap">
                    {formatRedactedLogBody(selectedLog.requestBodyRedacted)}
                  </pre>
                </div>

                <div>
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px] mb-1">
                    Response Body
                  </div>
                  <pre className="p-3 bg-slate-900 text-blue-300 font-mono text-[11px] rounded-lg overflow-x-auto max-h-64 whitespace-pre-wrap">
                    {formatRedactedLogBody(selectedLog.responseBodyRedacted)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Chọn một bản ghi API bên trái để kiểm tra gói tin
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
