import { useViewQueryState } from '../context/useViewQueryState';
import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

import { FileCode2, Send, Copy, Check, RefreshCw } from 'lucide-react';

import { useCommandAction, CommandNotice } from './useCommandAction';
import { CollectionState } from './CollectionState';
import { StatusBadge } from './StatusBadge';
import { ConfirmDialog } from './ConfirmDialog';

const ROUTE_STATUS_LABEL: Record<string, string> = {
  ENABLED: 'Hoạt động',
  DISABLED: 'Tạm dừng',
};

export const EDIView: React.FC = () => {
  const {
    currentUser,
    ediMessages,
    retryEdiMessage,
    ediRoutes,
    ediAlerts,
    upsertEdiRoute,
    dispatchEdiOutbox,
    acknowledgeEdiAlert,
    resolveEdiAlert,
  } = useApp();

  const can = (permission: string) =>
    currentUser.permissionCodes?.some((code) => code === '*' || code === permission) ?? false;
  const action = useCommandAction();
  const [tabValue, setTab] = useViewQueryState('edi', 'section', 'OUTBOX');
  const tab =
    tabValue === 'OUTBOX' || tabValue === 'ROUTES' || tabValue === 'ALERTS' ? tabValue : 'OUTBOX';
  const [selectedEdiId, setSelectedEdiId] = useViewQueryState(
    'edi',
    'selection',
    ediMessages[0]?.id || '',
  );
  const selectedEdi = ediMessages.find((m) => m.id === selectedEdiId) || null;
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useViewQueryState('edi', 'type', 'ALL');
  const [filterStatus, setFilterStatus] = useViewQueryState('edi', 'status', 'ALL');

  // Resolve alert modal state
  const [resolveModal, setResolveModal] = useState<{
    id: string;
    containerNumber: string;
    message: string;
  } | null>(null);

  const filteredEdi = ediMessages.filter((m) => {
    if (filterType !== 'ALL' && m.messageType !== filterType) return false;
    if (filterStatus !== 'ALL' && m.status !== filterStatus) return false;
    return true;
  });

  const handleCopy = async (payload: string) => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert('Không thể sao chép nội dung.');
    }
  };

  const handleResend = async (ediId: string) => {
    const result = await action.run(() => retryEdiMessage(ediId));
    if (result?.success) setSelectedEdiId(ediId);
  };

  return (
    <div className="space-y-6">
      <CommandNotice notice={action.notice} />
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <FileCode2 className="w-5 h-5 text-blue-600" />
            <span>Điện EDI gửi hãng tàu</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Theo dõi điện tín CODECO/COREOR và phản hồi xác nhận từ hãng tàu.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mr-1">
            <button
              aria-pressed={tab === 'OUTBOX'}
              onClick={() => setTab('OUTBOX')}
              className={`px-3 py-2 rounded-md font-bold ${tab === 'OUTBOX' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}
            >
              Thư đi
            </button>
            <button
              aria-pressed={tab === 'ROUTES'}
              onClick={() => setTab('ROUTES')}
              className={`px-3 py-2 rounded-md font-bold ${tab === 'ROUTES' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}
            >
              Tuyến kết nối
            </button>
            <button
              aria-pressed={tab === 'ALERTS'}
              onClick={() => setTab('ALERTS')}
              className={`px-3 py-2 rounded-md font-bold relative ${tab === 'ALERTS' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}
            >
              Cảnh báo
              {ediAlerts.some((a) => a.status === 'OPEN') && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>
              )}
            </button>
          </div>
          {tab === 'OUTBOX' && (
            <>
              <select
                aria-label="Lọc loại điện tín"
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700"
              >
                <option value="ALL">Tất cả loại điện tín</option>
                <option value="CODECO_GATE_IN">CODECO Gate In</option>
                <option value="CODECO_GATE_OUT">CODECO Gate Out</option>
                <option value="COREOR">COREOR Release Order</option>
              </select>
              <select
                aria-label="Lọc trạng thái điện tín"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700"
              >
                <option value="ALL">Tất cả trạng thái</option>
                <option value="PENDING">Chờ gửi</option>
                <option value="PROCESSING">Đang gửi</option>
                <option value="SENT">Đã gửi</option>
                <option value="FAILED">Gửi lỗi</option>
                <option value="DEAD">Hết thử lại</option>
              </select>
              <button
                disabled={action.pending || !can('edi.dispatch')}
                onClick={async () => {
                  await action.run(dispatchEdiOutbox);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" /> Chạy Dispatcher
              </button>
            </>
          )}
        </div>
      </div>

      {tab === 'ROUTES' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-caption">
              <tr>
                <th className="text-left px-4 py-3">Hãng tàu</th>
                <th className="text-left px-4 py-3">Phương thức kết nối</th>
                <th className="text-left px-4 py-3">Định dạng gửi</th>
                <th className="text-left px-4 py-3">Điểm nhận đối tác</th>
                <th className="text-left px-4 py-3">Trạng thái</th>
                <th className="text-right px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <tr>
                <td colSpan={6}>
                  <CollectionState resource="ediRoutes" count={ediRoutes.length} />
                </td>
              </tr>
              {ediRoutes.map((r) => (
                <tr key={r.shippingLineId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{r.shippingLineName}</td>
                  <td className="px-4 py-3">
                    <select
                      aria-label={`Phương thức kết nối ${r.shippingLineName}`}
                      disabled={action.pending || !can('edi.manage')}
                      value={r.transport}
                      onChange={(e) => {
                        const transport = e.target.value;
                        if (transport === 'MOCK' || transport === 'HTTPS' || transport === 'SFTP')
                          void action.run(() => upsertEdiRoute({ ...r, transport }));
                      }}
                      className="px-2 py-1 border border-slate-300 rounded-md bg-white font-mono text-caption"
                    >
                      <option value="MOCK">MOCK</option>
                      <option value="HTTPS">HTTPS</option>
                      <option value="SFTP">SFTP</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-caption">
                    {r.outboundFormat}
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-caption">
                    {r.partnerTarget || '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-caption font-bold ${r.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}
                    >
                      {ROUTE_STATUS_LABEL[r.enabled ? 'ENABLED' : 'DISABLED'] ?? (r.enabled ? 'Hoạt động' : 'Tạm dừng')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      disabled={action.pending || !can('edi.manage')}
                      onClick={() =>
                        void action.run(() => upsertEdiRoute({ ...r, enabled: !r.enabled }))
                      }
                      className={`px-3 py-1 rounded-md font-bold text-caption border ${r.enabled ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
                    >
                      {r.enabled ? 'Tắt' : 'Bật'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'ALERTS' && (
        <div className="space-y-3">
          <CollectionState resource="ediAlerts" count={ediAlerts.length} />
          {ediAlerts.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl border border-slate-200 p-4 text-xs flex items-start justify-between gap-4"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge domain="ediAlertStatus" value={a.status} />
                  <span className="font-mono font-bold text-slate-800">{a.containerNumber}</span>
                  <span className="text-slate-400">· {a.shippingLine}</span>
                </div>
                <p className="text-slate-600">{a.message}</p>
                <p className="text-slate-400 mt-1">
                  {new Date(a.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                </p>
                {a.resolutionNote && <p className="text-emerald-700 mt-1">✓ {a.resolutionNote}</p>}
              </div>
              {a.status !== 'RESOLVED' && (
                <div className="flex flex-col gap-2 shrink-0">
                  {a.status === 'OPEN' && (
                    <button
                      disabled={action.pending || !can('edi.alert.manage')}
                      onClick={() => void action.run(() => acknowledgeEdiAlert(a.id))}
                      className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md font-bold border border-amber-200"
                    >
                      Đã xem
                    </button>
                  )}
                  <button
                    disabled={action.pending || !can('edi.alert.manage')}
                    onClick={() =>
                      setResolveModal({
                        id: a.id,
                        containerNumber: a.containerNumber,
                        message: a.message,
                      })
                    }
                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md font-bold border border-emerald-200"
                  >
                    Đánh dấu đã xử lý
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'OUTBOX' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Messages List */}
          <div className="space-y-2">
            <CollectionState
              resource="ediMessages"
              count={filteredEdi.length}
              total={ediMessages.length}
              filtered={filterType !== 'ALL' || filterStatus !== 'ALL'}
              onClear={() => { setFilterType('ALL'); setFilterStatus('ALL'); }}
            />
            {filteredEdi.map((edi) => {
              const isSelected = selectedEdi?.id === edi.id;
              return (
                <button
                  type="button"
                  aria-pressed={isSelected}
                  key={edi.id}
                  onClick={() => setSelectedEdiId(edi.id)}
                  className={`block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 p-4 rounded-xl border cursor-pointer transition ${
                    isSelected
                      ? 'bg-blue-50/60 border-blue-500 shadow-xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="block flex items-center justify-between gap-1">
                    <StatusBadge domain="ediMessageType" value={edi.messageType} />
                    <StatusBadge domain="ediOutboxStatus" value={edi.status} />
                  </span>
                  <span className="block font-mono font-bold text-slate-800 text-xs mt-1">
                    {edi.containerNumber}
                  </span>
                  {/* ACK badge if present */}
                  {edi.ackStatus && (
                    <span className="block mt-1">
                      <StatusBadge domain="ediAckStatus" value={edi.ackStatus} />
                    </span>
                  )}
                  {/* Retry count warning */}
                  {edi.retryCount > 0 && (
                    <span className="block mt-1 text-caption text-amber-700 font-semibold">
                      🔁 {edi.retryCount} lần thử lại
                    </span>
                  )}
                  <span className="block flex items-center justify-between text-caption text-slate-500 mt-2">
                    <span>
                      Hãng tàu: <strong className="text-slate-700">{edi.shippingLine}</strong>
                    </span>
                    <span>
                      {edi.status === 'SENT' && edi.sentAt
                        ? `Gửi: ${new Date(edi.sentAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`
                        : new Date(edi.createdAt).toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </span>
                  </span>
                  {/* Error preview in list for FAILED/DEAD */}
                  {(edi.status === 'FAILED' || edi.status === 'DEAD') && edi.lastError && (
                    <span className="block mt-1 text-caption text-rose-700 truncate">
                      Lỗi: {edi.lastError.slice(0, 80)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right 2 Columns: Payload & Transmission Inspector */}
          <div className="lg:col-span-2">
            {selectedEdi ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-base font-bold text-slate-900">Điện tín:</span>
                      <StatusBadge domain="ediMessageType" value={selectedEdi.messageType} />
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 font-bold rounded">
                        Hãng nhận: {selectedEdi.shippingLine}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-1">
                      Container liên quan:{' '}
                      <strong className="font-mono text-slate-800">
                        {selectedEdi.containerNumber}
                      </strong>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                    <button
                      disabled={selectedEdi.payloadSnapshot == null}
                      onClick={() =>
                        handleCopy(JSON.stringify(selectedEdi.payloadSnapshot, null, 2))
                      }
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center space-x-1"
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                    {selectedEdi.status !== 'SENT' && can('edi.manage') && (
                      <button
                        disabled={action.pending}
                        onClick={() => handleResend(selectedEdi.id)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center space-x-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Gửi lại</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Status and Transmission metadata */}
                <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-slate-400">Trạng thái truyền:</span>
                    <div className="mt-1">
                      <StatusBadge domain="ediOutboxStatus" value={selectedEdi.status} />
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Thời gian tạo:</span>
                    <div className="font-semibold text-slate-800 mt-1">
                      {new Date(selectedEdi.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Số lần thử lại:</span>
                    <div className={`font-semibold mt-1 ${selectedEdi.retryCount > 0 ? 'text-amber-700' : 'text-slate-800'}`}>
                      {selectedEdi.retryCount} lần
                    </div>
                  </div>
                  {selectedEdi.sentAt && (
                    <div>
                      <span className="text-slate-400">Thời gian gửi:</span>
                      <div className="font-semibold text-slate-800 mt-1">
                        {new Date(selectedEdi.sentAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                      </div>
                    </div>
                  )}
                  {selectedEdi.ackStatus && (
                    <div className="col-span-2">
                      <span className="text-slate-400">Phản hồi hãng tàu (ACK):</span>
                      <div className="mt-1">
                        <StatusBadge domain="ediAckStatus" value={selectedEdi.ackStatus} />
                        {selectedEdi.ackReference && (
                          <span className="ml-2 font-mono text-slate-500">{selectedEdi.ackReference}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* REJECTED warning */}
                {selectedEdi.ackStatus === 'REJECTED' && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 font-semibold">
                    ⚠ Hãng tàu từ chối điện tín này – kiểm tra lại dữ liệu container trước khi gửi lại.
                  </div>
                )}

                {/* Error detail for FAILED/DEAD */}
                {(selectedEdi.status === 'FAILED' || selectedEdi.status === 'DEAD') && selectedEdi.lastError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg">
                    <div className="font-bold text-rose-800 mb-1">Lý do lỗi:</div>
                    <EdiErrorDetail error={selectedEdi.lastError} />
                  </div>
                )}

                {/* Raw EDI Payload Output */}
                <div>
                  <div className="font-bold text-slate-700 uppercase tracking-wider text-caption mb-2">
                    Nội dung điện tín EDI:
                  </div>
                  <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
                    {selectedEdi.payloadSnapshot == null
                      ? 'Chưa có nội dung điện tín cho bản ghi này.'
                      : JSON.stringify(selectedEdi.payloadSnapshot, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
                Chọn một điện tín bên trái để xem nội dung mã hóa EDIFACT
              </div>
            )}
          </div>
        </div>
      )}

      {/* Resolve alert modal */}
      {resolveModal && (
        <ConfirmDialog
          title="Xác nhận đã xử lý cảnh báo"
          message="Vui lòng mô tả cách bạn đã xử lý cảnh báo này để lưu lại vết thao tác."
          summary={[
            { label: 'Container', value: resolveModal.containerNumber },
            { label: 'Nội dung cảnh báo', value: resolveModal.message },
          ]}
          reason={{
            label: 'Ghi chú xử lý',
            placeholder: 'Mô tả cách xử lý cảnh báo...',
            minLength: 10,
          }}
          confirmLabel="Xác nhận đã xử lý"
          tone="primary"
          pending={action.pending}
          notice={action.notice}
          onConfirm={async (note) => {
            const result = await action.run(() => resolveEdiAlert(resolveModal.id, note));
            if (result?.success) setResolveModal(null);
          }}
          onClose={() => setResolveModal(null)}
        />
      )}
    </div>
  );
};

/** Shows lastError with expand/collapse for long messages */
function EdiErrorDetail({ error }: { error: string }) {
  const [expanded, setExpanded] = useState(false);
  const SHORT_LIMIT = 200;
  const isLong = error.length > SHORT_LIMIT;
  return (
    <div className="text-rose-700 font-mono text-caption break-all">
      {expanded || !isLong ? error : error.slice(0, SHORT_LIMIT) + '…'}
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="ml-2 text-rose-600 underline font-sans font-semibold"
        >
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}
