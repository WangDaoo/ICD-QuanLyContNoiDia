import { useViewQueryState } from '../context/useViewQueryState';
import { ModalOverlay } from './ModalOverlay';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PartnerApiClient } from '../types';
import { formatRedactedLogBody } from '../services/redacted-log-body';
import { KeyRound, FileCode, Plus, RotateCw, ShieldOff, ChevronDown, ChevronUp } from 'lucide-react';

import { useCommandAction, CommandNotice } from './useCommandAction';
import { useFormValidation, FormErrors } from './useFormValidation';
import { CollectionState, ConfirmedResourceValue } from './CollectionState';
import { ConfirmDialog } from './ConfirmDialog';
import { businessLabel, TONE_CLASSES, businessTone } from '../lib/business-labels';
import { formatVietnamDateTime } from '../lib/time';

interface PartnerManagementViewProps {
  mode: 'CLIENTS' | 'LOGS';
}

// Partner API scope definitions (backend names from handover.constants.ts)
const PARTNER_SCOPES = [
  { code: 'handovers:read',       label: 'Xem bàn giao',                  desc: 'Đọc danh sách và chi tiết lệnh bàn giao' },
  { code: 'handovers:accept',     label: 'Tiếp nhận nhiệm vụ',            desc: 'Báo tiếp nhận lệnh bàn giao qua API' },
  { code: 'handovers:in_transit', label: 'Báo đang vận chuyển',           desc: 'Cập nhật trạng thái container đang trên đường' },
  { code: 'handovers:confirm',    label: 'Xác nhận kho đã nhận hàng',     desc: 'Nộp biên bản POD và xác nhận giao thành công' },
  { code: 'handovers:dispute',    label: 'Khởi tạo tranh chấp',           desc: 'Báo cáo sai lệch / tranh chấp khi giao' },
  { code: 'containers:read',      label: 'Xem thông tin container',        desc: 'Đọc thông tin container liên quan đến bàn giao' },
];

const DEFAULT_SCOPES = ['handovers:read', 'handovers:accept', 'handovers:in_transit', 'handovers:confirm'];

function ScopeDescription({ code }: { code: string }) {
  const scope = PARTNER_SCOPES.find((s) => s.code === code);
  if (scope) return <span>{scope.label}</span>;
  return <span>{code}</span>;
}

export const PartnerManagementView: React.FC<PartnerManagementViewProps> = ({ mode }) => {
  const { partnerClients, partnerApiLogs, rotatePartnerApiKey, createPartnerClient, revokePartnerClient } = useApp();
  const action = useCommandAction();
  const validation = useFormValidation();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [keyCopiedOnce, setKeyCopiedOnce] = useState(false);
  const [selectedLogId, setSelectedLogId] = useViewQueryState(
    'partner-api-logs',
    'selection',
    partnerApiLogs[0]?.id ?? '',
  );
  const selectedLog = partnerApiLogs.find((log) => log.id === selectedLogId) ?? null;

  // Log filters
  const [logPartnerFilter, setLogPartnerFilter] = useViewQueryState('partner-api-logs', 'partner', 'ALL');
  const [logHttpFilter, setLogHttpFilter] = useViewQueryState('partner-api-logs', 'http', 'ALL');
  const [logContFilter, setLogContFilter] = useViewQueryState('partner-api-logs', 'container', '');

  // New partner state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRotateFlow, setIsRotateFlow] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(DEFAULT_SCOPES);
  const [newApiKeyResult, setNewApiKeyResult] = useState<string | null>(null);
  const [rotateConfirmClient, setRotateConfirmClient] = useState<PartnerApiClient | null>(null);
  const [revokeConfirmClient, setRevokeConfirmClient] = useState<PartnerApiClient | null>(null);
  const [expandedHashIds, setExpandedHashIds] = useState<Set<string>>(new Set());

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(text);
      setKeyCopiedOnce(true);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch {
      alert('Không thể sao chép. Vui lòng chọn và sao chép khóa thủ công.');
    }
  };

  const handleRotateConfirm = async (_reason: string) => {
    if (!rotateConfirmClient) return;
    const client = rotateConfirmClient;
    setRotateConfirmClient(null);
    const res = await action.run(() => rotatePartnerApiKey(client.id));
    if (!res) return;
    if (!res.success || !res.plainApiKey) {
      return;
    }
    setIsRotateFlow(true);
    setKeyCopiedOnce(false);
    setNewApiKeyResult(res.plainApiKey);
    setShowAddModal(true);
  };

  const handleRevokeConfirm = async (_reason: string) => {
    if (!revokeConfirmClient) return;
    const client = revokeConfirmClient;
    setRevokeConfirmClient(null);
    await action.run(() => revokePartnerClient(client.id));
  };

  const handleCreatePartner = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (action.isPending() || !validation.validate(e.currentTarget)) return;
    if (selectedScopes.length === 0) return;
    const res = await action.run(() =>
      createPartnerClient(newCode.trim().toUpperCase(), newName.trim(), selectedScopes),
    );
    if (res?.success && res.plainApiKey) {
      setIsRotateFlow(false);
      setKeyCopiedOnce(false);
      setNewApiKeyResult(res.plainApiKey);
    }
  };

  const toggleScope = (code: string) => {
    setSelectedScopes((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
  };

  // Filtered logs
  const filteredLogs = partnerApiLogs.filter((log) => {
    if (logPartnerFilter !== 'ALL' && log.partnerClientId !== logPartnerFilter) return false;
    if (logHttpFilter !== 'ALL') {
      const filterCode = parseInt(logHttpFilter, 10);
      if (!isNaN(filterCode) && log.httpStatus !== filterCode) return false;
    }
    if (logContFilter.trim() && !log.containerNumber?.toLowerCase().includes(logContFilter.trim().toLowerCase())) return false;
    return true;
  });

  if (mode === 'CLIENTS') {
    return (
      <div className="space-y-6">
        {/* Rotate confirm dialog */}
        {rotateConfirmClient && (
          <ConfirmDialog
            title={`Xoay vòng khóa API — ${rotateConfirmClient.partnerName}`}
            message="Khóa API hiện tại sẽ bị vô hiệu hóa ngay lập tức. Hệ thống đối tác sẽ cần cập nhật sang khóa mới. Thao tác này không thể hoàn tác."
            summary={[
              { label: 'Đối tác', value: rotateConfirmClient.partnerName },
              { label: 'Mã đối tác', value: rotateConfirmClient.partnerCode },
              { label: 'Khóa hiện tại', value: `icd_live_••••••••••••${rotateConfirmClient.keyLast4}` },
            ]}
            confirmLabel="Xác nhận xoay vòng khóa"
            tone="danger"
            pending={action.pending}
            notice={action.notice}
            onConfirm={(reason) => void handleRotateConfirm(reason)}
            onClose={() => setRotateConfirmClient(null)}
          />
        )}

        {/* Revoke confirm dialog */}
        {revokeConfirmClient && (
          <ConfirmDialog
            title={`Thu hồi quyền truy cập — ${revokeConfirmClient.partnerName}`}
            message="Tất cả yêu cầu API từ đối tác này sẽ bị chặn ngay lập tức. Hành động này không thể hoàn tác."
            summary={[
              { label: 'Đối tác', value: revokeConfirmClient.partnerName },
              { label: 'Mã đối tác', value: revokeConfirmClient.partnerCode },
            ]}
            confirmLabel="Thu hồi quyền truy cập"
            tone="danger"
            pending={action.pending}
            notice={action.notice}
            onConfirm={(reason) => void handleRevokeConfirm(reason)}
            onClose={() => setRevokeConfirmClient(null)}
          />
        )}

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
              <KeyRound className="w-5 h-5 text-indigo-600" />
              <span>Đối tác tích hợp API vận chuyển</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý khóa API, quyền truy cập và xoay vòng khóa bí mật cho đối tác bàn giao ngoài ICD
            </p>
          </div>

          <button
            onClick={() => {
              setIsRotateFlow(false);
              setNewApiKeyResult(null);
              setNewCode('');
              setNewName('');
              setSelectedScopes(DEFAULT_SCOPES);
              setKeyCopiedOnce(false);
              setShowAddModal(true);
            }}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm đối tác API mới</span>
          </button>
        </div>

        {!showAddModal && !rotateConfirmClient && !revokeConfirmClient && (
          <CommandNotice notice={action.notice} />
        )}
        <CollectionState resource="partnerClients" count={partnerClients.length} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
          {partnerClients.map((client) => {
            const statusLabel = businessLabel('partnerClientStatus', client.status);
            const statusTone = businessTone('partnerClientStatus', client.status);
            const isHashExpanded = expandedHashIds.has(client.id);

            return (
              <div
                key={client.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4 hover:border-indigo-300 transition"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-slate-900">{client.partnerName}</div>
                    <span className="font-mono text-indigo-700 font-semibold">
                      {client.partnerCode}
                    </span>
                  </div>
                  <span className={`px-3 py-1 rounded-full font-bold text-caption ring-1 ${TONE_CLASSES[statusTone]}`}>
                    {statusLabel}
                  </span>
                </div>

                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Khóa API (ẩn một phần):</span>
                    <span className="font-mono text-slate-700 font-bold">
                      icd_live_••••••••••••{client.keyLast4}
                    </span>
                  </div>

                  <div className="flex items-start justify-between">
                    <span className="text-slate-500 font-semibold">Quyền truy cập API:</span>
                    <div className="flex flex-wrap gap-1 justify-end max-w-[220px]">
                      {client.scopes.map((s) => (
                        <span
                          key={s}
                          className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-caption ring-1 ring-indigo-200"
                          title={s}
                        >
                          <ScopeDescription code={s} />
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Yêu cầu gần nhất:</span>
                    <span className="text-slate-700 font-medium">
                      {client.lastRequestAt
                        ? formatVietnamDateTime(client.lastRequestAt)
                        : 'Chưa có cuộc gọi nào'}
                    </span>
                  </div>

                  {/* Collapsible hash for audit */}
                  <div>
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedHashIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(client.id)) next.delete(client.id);
                          else next.add(client.id);
                          return next;
                        })
                      }
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-caption"
                    >
                      {isHashExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      Băm xác minh (SHA-256)
                    </button>
                    {isHashExpanded && (
                      <span
                        className="block font-mono text-slate-500 text-caption break-all mt-1"
                        title="SHA-256 hash dùng cho kiểm toán"
                      >
                        {client.apiKeyHash}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  {client.status === 'ACTIVE' && (
                    <>
                      <button
                        disabled={action.pending}
                        onClick={() => setRotateConfirmClient(client)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center space-x-1.5 transition"
                      >
                        <RotateCw className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Xoay vòng khóa</span>
                      </button>
                      <button
                        disabled={action.pending}
                        onClick={() => setRevokeConfirmClient(client)}
                        className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-lg flex items-center space-x-1.5 transition border border-rose-200"
                      >
                        <ShieldOff className="w-3.5 h-3.5" />
                        <span>Thu hồi quyền truy cập</span>
                      </button>
                    </>
                  )}
                  {client.status === 'REVOKED' && (
                    <span className="text-slate-400 text-caption px-3 py-2">Đã thu hồi — không thể xoay vòng khóa</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {showAddModal && (
          <ModalOverlay
            aria-labelledby="partner-management-dialog-1-title"
            pending={action.pending}
            onClose={() => {
              if (!action.isPending() && !newApiKeyResult) setShowAddModal(false);
            }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
          >
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-xs">
              <h3
                id="partner-management-dialog-1-title"
                className="text-base font-bold text-slate-900 mb-2"
              >
                {isRotateFlow ? 'Khóa API mới đã được cấp' : 'Đăng ký đối tác tích hợp API mới'}
              </h3>

              {newApiKeyResult ? (
                <div className="space-y-4">
                  <CommandNotice notice={action.notice} />
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-amber-900 font-semibold flex items-start gap-2">
                    <span className="text-lg">⚠</span>
                    <span>
                      Khóa API chỉ hiển thị một lần duy nhất. Sao chép ngay và cung cấp an toàn cho đối tác — không thể xem lại sau khi đóng cửa sổ này.
                    </span>
                  </div>
                  <div className="p-3 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg break-all">
                    {newApiKeyResult}
                  </div>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void handleCopy(newApiKeyResult)}
                      className="px-4 py-2 border border-slate-300 rounded-lg font-semibold"
                    >
                      {copiedKey === newApiKeyResult ? '✓ Đã sao chép' : 'Sao chép khóa API'}
                    </button>
                    <button
                      type="button"
                      disabled={!keyCopiedOnce}
                      onClick={() => {
                        setShowAddModal(false);
                        setNewApiKeyResult(null);
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!keyCopiedOnce ? 'Vui lòng sao chép khóa trước khi đóng' : undefined}
                    >
                      Hoàn tất
                    </button>
                  </div>
                  {!keyCopiedOnce && (
                    <p className="text-caption text-amber-800 text-center">
                      Nhấn "Sao chép khóa API" trước khi đóng để không mất khóa.
                    </p>
                  )}
                </div>
              ) : (
                <form noValidate onSubmit={handleCreatePartner} className="space-y-4">
                  <CommandNotice notice={action.notice} />
                  <FormErrors errors={validation.errors} />
                  <fieldset disabled={action.pending} className="space-y-4">
                    <div>
                      <label
                        htmlFor="partner-management-new-code"
                        className="block font-semibold text-slate-700 mb-1"
                      >
                        Mã đối tác*
                      </label>
                      <input
                        id="partner-management-new-code"
                        {...validation.props('partner-management-new-code')}
                        type="text"
                        required
                        placeholder="VD: TRANS_EXPRESS"
                        value={newCode}
                        onChange={(e) => setNewCode(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg uppercase font-mono"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="partner-management-new-name"
                        className="block font-semibold text-slate-700 mb-1"
                      >
                        Tên công ty đối tác*
                      </label>
                      <input
                        id="partner-management-new-name"
                        {...validation.props('partner-management-new-name')}
                        type="text"
                        required
                        placeholder="VD: Công ty TNHH Vận tải Toàn Cầu"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <div className="block font-semibold text-slate-700 mb-2">
                        Quyền truy cập API* <span className="font-normal text-slate-400">(chọn tối thiểu 1)</span>
                      </div>
                      <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        {PARTNER_SCOPES.map((scope) => (
                          <label key={scope.code} className="flex items-start gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedScopes.includes(scope.code)}
                              onChange={() => toggleScope(scope.code)}
                              className="mt-0.5 w-4 h-4 text-indigo-600 border-slate-300 rounded"
                            />
                            <div>
                              <span className="font-semibold text-slate-800">{scope.label}</span>
                              <span className="text-slate-500 ml-2">{scope.desc}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                      {selectedScopes.length === 0 && (
                        <p className="mt-1 text-caption text-rose-600">Vui lòng chọn ít nhất một quyền.</p>
                      )}
                    </div>
                  </fieldset>
                  <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
                    <button
                      type="button"
                      disabled={action.pending}
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={action.pending || selectedScopes.length === 0}
                      className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Tạo & Cấp khóa API
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
            <span>Nhật ký API đối tác</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Giám sát các cuộc gọi API từ đối tác: tiếp nhận nhiệm vụ, xác nhận giao kho, tải POD, tọa độ GPS
          </p>
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-lg font-semibold">
          <ConfirmedResourceValue resource="partnerApiLogs">{partnerApiLogs.length} cuộc gọi API đã ghi nhận</ConfirmedResourceValue>
        </span>
      </div>

      {/* Log filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-3 text-xs">
        <select
          aria-label="Lọc theo đối tác"
          value={logPartnerFilter}
          onChange={(e) => setLogPartnerFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-medium"
        >
          <option value="ALL">Tất cả đối tác</option>
          {partnerClients.map((p) => (
            <option key={p.id} value={p.id}>{p.partnerName}</option>
          ))}
        </select>

        <select
          aria-label="Lọc theo HTTP status"
          value={logHttpFilter}
          onChange={(e) => setLogHttpFilter(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-medium"
        >
          <option value="ALL">Tất cả HTTP status</option>
          <option value="200">HTTP 200 (Thành công)</option>
          <option value="400">HTTP 400 (Lỗi dữ liệu)</option>
          <option value="401">HTTP 401 (Không xác thực)</option>
          <option value="403">HTTP 403 (Không có quyền)</option>
          <option value="404">HTTP 404 (Không tìm thấy)</option>
          <option value="409">HTTP 409 (Xung đột trạng thái)</option>
          <option value="500">HTTP 500 (Lỗi hệ thống)</option>
        </select>

        <div className="relative">
          <input
            type="text"
            aria-label="Lọc theo số container"
            placeholder="Tìm theo số container..."
            value={logContFilter}
            onChange={(e) => setLogContFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 text-slate-700 font-mono w-52"
          />
        </div>

        <span className="text-slate-400 self-center ml-auto">
          {filteredLogs.length} / {partnerApiLogs.length} bản ghi
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Logs list */}
        <div className="space-y-2">
          <CollectionState resource="partnerApiLogs" count={filteredLogs.length} />
          {filteredLogs.map((log) => {
            const isSelected = selectedLog?.id === log.id;
            const isSuccess = log.httpStatus >= 200 && log.httpStatus < 300;
            return (
              <button
                type="button"
                aria-pressed={isSelected}
                key={log.id}
                onClick={() => setSelectedLogId(log.id)}
                className={`block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 p-4 rounded-xl border cursor-pointer transition text-xs ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="block flex items-center justify-between">
                  <span className="px-2 py-1 bg-indigo-100 text-indigo-800 font-mono font-bold rounded text-caption">
                    {log.method}
                  </span>
                  <span className={`font-mono font-bold ${isSuccess ? 'text-emerald-600' : 'text-rose-600'}`}>
                    HTTP {log.httpStatus}
                    {log.errorCode && <span className="ml-1 text-rose-500">· {log.errorCode}</span>}
                  </span>
                </span>
                <span className="block font-mono text-slate-800 font-semibold mt-1 truncate">
                  {log.endpoint}
                </span>
                {log.containerNumber && (
                  <span className="block font-mono text-indigo-700 font-bold text-caption mt-0.5">
                    {log.containerNumber}
                  </span>
                )}
                <span className="block flex items-center justify-between text-caption text-slate-400 mt-2">
                  <span>
                    <strong className="text-slate-700">{log.partnerName}</strong>
                    {log.businessStatus && (
                      <span className="ml-2 text-slate-500">· {log.businessStatus}</span>
                    )}
                  </span>
                  <span>{new Date(log.createdAt).toLocaleTimeString('vi-VN')}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Right 2 Columns: Log detail */}
        <div className="lg:col-span-2">
          {selectedLog ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-indigo-600 text-white font-mono font-bold rounded">
                    {selectedLog.method}
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedLog.endpoint}
                  </span>
                </div>
                <span className="text-slate-400 font-mono">
                  Độ trễ: {selectedLog.latencyMs}ms · {formatVietnamDateTime(selectedLog.createdAt)}
                </span>
              </div>

              {/* Lookup info */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500">Đối tác:</span>{' '}
                  <strong>{selectedLog.partnerName}</strong>
                </div>
                {selectedLog.containerNumber && (
                  <div>
                    <span className="text-slate-500">Container:</span>{' '}
                    <strong className="font-mono">{selectedLog.containerNumber}</strong>
                  </div>
                )}
                <div>
                  <span className="text-slate-500">HTTP Status:</span>{' '}
                  <strong className={selectedLog.httpStatus >= 400 ? 'text-rose-700' : 'text-emerald-700'}>
                    {selectedLog.httpStatus}
                  </strong>
                </div>
                {selectedLog.businessStatus && (
                  <div>
                    <span className="text-slate-500">Trạng thái xử lý:</span>{' '}
                    <strong>{selectedLog.businessStatus}</strong>
                  </div>
                )}
                {selectedLog.errorCode && (
                  <div className="col-span-2">
                    <span className="text-slate-500">Mã lỗi:</span>{' '}
                    <strong className="text-rose-700 font-mono">{selectedLog.errorCode}</strong>
                  </div>
                )}
                <div className="col-span-2 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-slate-500">Mã yêu cầu:</span>{' '}
                    <span className="font-mono text-slate-700">{selectedLog.requestId}</span>
                    <button
                      type="button"
                      onClick={() => void handleCopy(selectedLog.requestId)}
                      className="ml-1 text-indigo-600 underline hover:text-indigo-800 text-caption"
                    >
                      {copiedKey === selectedLog.requestId ? 'Đã sao chép' : 'Sao chép'}
                    </button>
                  </div>
                  {selectedLog.idempotencyKey && (
                    <div className="flex items-center gap-1">
                      <span className="text-slate-500">Mã kiểm soát trùng lặp:</span>{' '}
                      <span className="font-mono text-slate-500 max-w-[120px] truncate" title={selectedLog.idempotencyKey}>
                        {selectedLog.idempotencyKey.slice(0, 8)}••••{selectedLog.idempotencyKey.slice(-4)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-caption mb-1">
                    Nội dung yêu cầu (đã ẩn thông tin nhạy cảm)
                  </div>
                  <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-caption rounded-lg overflow-x-auto max-h-64 whitespace-pre-wrap">
                    {formatRedactedLogBody(selectedLog.requestBodyRedacted)}
                  </pre>
                </div>

                <div>
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-caption mb-1">
                    Nội dung phản hồi
                  </div>
                  <pre className="p-3 bg-slate-900 text-blue-300 font-mono text-caption rounded-lg overflow-x-auto max-h-64 whitespace-pre-wrap">
                    {formatRedactedLogBody(selectedLog.responseBodyRedacted)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Chọn một bản ghi API bên trái để xem chi tiết
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
