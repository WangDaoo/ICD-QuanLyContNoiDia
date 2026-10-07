import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EdiOutboxMessage } from '../types';
import {
  FileCode2,
  Send,
  Download,
  Copy,
  CheckCircle2,
  Clock,
  Search,
  Check,
  RefreshCw,
} from 'lucide-react';

export const EDIView: React.FC = () => {
  const { ediMessages, retryEdiMessage, ediRoutes, ediAlerts, upsertEdiRoute, dispatchEdiOutbox, acknowledgeEdiAlert, resolveEdiAlert } = useApp();

  const [tab, setTab] = useState<'OUTBOX' | 'ROUTES' | 'ALERTS'>('OUTBOX');
  const [selectedEdiId, setSelectedEdiId] = useState<string | null>(ediMessages[0]?.id || null);
  const selectedEdi = ediMessages.find((m) => m.id === selectedEdiId) || null;
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredEdi = ediMessages.filter((m) => {
    if (filterType !== 'ALL' && m.messageType !== filterType) return false;
    return true;
  });

  const getSimulatedEdifact = (msg: EdiOutboxMessage) => {
    return `UNB+UNOA:2+VNICD+${msg.shippingLine}+${new Date(msg.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}:${new Date(msg.createdAt).toISOString().slice(11, 16).replace(/:/g, '')}+${msg.id.slice(-6)}'
UNH+${msg.id.slice(-6)}+${msg.messageType}:D:00B:UN:SMDG20'
BGM+34+${msg.id}+9'
NAD+MS+VNICD:160:ZZZ'
NAD+MR+${msg.shippingLine}:160:ZZZ'
EQD+CN+${msg.containerNumber}+45G1:102:5++2+5'
LOC+11+VNICD:139:6'
DTM+132:${new Date(msg.createdAt).toISOString().slice(0, 10).replace(/-/g, '')}:102'
CNT+16:1'
UNT+9+${msg.id.slice(-6)}'
UNZ+1+${msg.id.slice(-6)}'`;
  };

  const handleCopy = async (payload: string) => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { alert('Không thể sao chép nội dung.'); }
  };

  const handleResend = async (ediId: string) => {
    const result = await retryEdiMessage(ediId);
    alert(result.message);
    if (result.success) setSelectedEdiId(ediId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <FileCode2 className="w-5 h-5 text-blue-600" />
            <span>Trung tâm Trao đổi Dữ liệu Điện tử (EDI Center)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Giao tiếp tự động chuẩn UN/EDIFACT (CODECO_GATE_IN, CODECO_GATE_OUT, COREOR) với các Hãng tàu quốc tế và Cục Hải quan
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="flex gap-1 bg-slate-100 p-1 rounded-lg mr-1">
            <button onClick={() => setTab('OUTBOX')} className={`px-3 py-1.5 rounded-md font-bold ${tab === 'OUTBOX' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}>Outbox</button>
            <button onClick={() => setTab('ROUTES')} className={`px-3 py-1.5 rounded-md font-bold ${tab === 'ROUTES' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}>Routes</button>
            <button onClick={() => setTab('ALERTS')} className={`px-3 py-1.5 rounded-md font-bold relative ${tab === 'ALERTS' ? 'bg-white shadow-xs text-blue-700' : 'text-slate-500'}`}>
              Alerts
              {ediAlerts.some((a) => a.status === 'OPEN') && <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full"></span>}
            </button>
          </div>
          {tab === 'OUTBOX' && (
            <>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 font-semibold text-slate-700"
              >
                <option value="ALL">Tất cả loại điện tín</option>
                <option value="CODECO_GATE_IN">CODECO Gate In</option>
                <option value="CODECO_GATE_OUT">CODECO Gate Out</option>
                <option value="COREOR">COREOR Release Order</option>
              </select>
              <button
                onClick={async () => {
                  const res = await dispatchEdiOutbox();
                  alert(res.message);
                }}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center gap-1.5"
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
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px]">
              <tr>
                <th className="text-left px-4 py-3">Hãng tàu</th>
                <th className="text-left px-4 py-3">Transport</th>
                <th className="text-left px-4 py-3">Outbound Format</th>
                <th className="text-left px-4 py-3">Đích (Partner Target)</th>
                <th className="text-left px-4 py-3">Trạng thái</th>
                <th className="text-right px-4 py-3">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ediRoutes.map((r) => (
                <tr key={r.shippingLineId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-bold text-slate-800">{r.shippingLineName}</td>
                  <td className="px-4 py-3">
                    <select
                      value={r.transport}
                      onChange={(e) => upsertEdiRoute({ ...r, transport: e.target.value as any })}
                      className="px-2 py-1 border border-slate-300 rounded-md bg-white font-mono text-[11px]"
                    >
                      <option value="MOCK">MOCK</option>
                      <option value="HTTPS">HTTPS</option>
                      <option value="SFTP">SFTP</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{r.outboundFormat}</td>
                  <td className="px-4 py-3 font-mono text-slate-500 text-[11px]">{r.partnerTarget || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${r.enabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>
                      {r.enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => upsertEdiRoute({ ...r, enabled: !r.enabled })}
                      className={`px-2.5 py-1 rounded-md font-bold text-[11px] border ${r.enabled ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}
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
          {ediAlerts.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-xs">Không có alert nào.</div>
          )}
          {ediAlerts.map((a) => (
            <div key={a.id} className="bg-white rounded-xl border border-slate-200 p-4 text-xs flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    a.status === 'OPEN' ? 'bg-rose-100 text-rose-800' : a.status === 'ACKNOWLEDGED' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {a.status}
                  </span>
                  <span className="font-mono font-bold text-slate-800">{a.containerNumber}</span>
                  <span className="text-slate-400">· {a.shippingLine}</span>
                </div>
                <p className="text-slate-600">{a.message}</p>
                <p className="text-slate-400 mt-1">{new Date(a.createdAt).toLocaleString('vi-VN')}</p>
                {a.resolutionNote && <p className="text-emerald-700 mt-1">✓ {a.resolutionNote}</p>}
              </div>
              {a.status !== 'RESOLVED' && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  {a.status === 'OPEN' && (
                    <button onClick={() => acknowledgeEdiAlert(a.id)} className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-md font-bold border border-amber-200">
                      Đã xem
                    </button>
                  )}
                  <button
                    onClick={() => {
                      const note = window.prompt('Ghi chú xử lý:');
                      if (note) resolveEdiAlert(a.id, note);
                    }}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md font-bold border border-emerald-200"
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
          {filteredEdi.map((edi) => {
            const isSelected = selectedEdi?.id === edi.id;
            return (
              <div
                key={edi.id}
                onClick={() => setSelectedEdiId(edi.id)}
                className={`p-4 rounded-xl border cursor-pointer transition ${
                  isSelected
                    ? 'bg-blue-50/60 border-blue-500 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-blue-700">{edi.messageType}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      edi.status === 'SENT'
                        ? 'bg-emerald-100 text-emerald-800'
                        : edi.status === 'PROCESSING'
                        ? 'bg-blue-100 text-blue-800'
                        : edi.status === 'FAILED'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {edi.status}
                  </span>
                </div>
                <div className="font-mono font-bold text-slate-800 text-xs mt-1">{edi.containerNumber}</div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                  <span>Hãng tàu: <strong className="text-slate-700">{edi.shippingLine}</strong></span>
                  <span>{new Date(edi.createdAt).toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right 2 Columns: Payload & Transmission Inspector */}
        <div className="lg:col-span-2">
          {selectedEdi ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-base font-bold text-slate-900 font-mono">Điện tín {selectedEdi.messageType}</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-bold rounded">
                      Hãng nhận: {selectedEdi.shippingLine}
                    </span>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Container liên quan: <strong className="font-mono text-slate-800">{selectedEdi.containerNumber}</strong> · Idempotency Key: <span className="font-mono text-slate-600">{selectedEdi.idempotencyKey}</span>
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleCopy(getSimulatedEdifact(selectedEdi))}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center space-x-1"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Đã sao chép' : 'Copy'}</span>
                  </button>
                  {selectedEdi.status !== 'SENT' && (
                    <button
                      onClick={() => handleResend(selectedEdi.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Gửi lại (Retry Transmission)</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Status and Transmission metadata */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400">Trạng thái truyền:</span>
                  <div className="font-bold text-slate-800 mt-0.5">{selectedEdi.status}</div>
                </div>
                <div>
                  <span className="text-slate-400">Thời gian tạo:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {new Date(selectedEdi.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Số lần thử lại:</span>
                  <div className="font-semibold text-slate-800 mt-0.5">
                    {selectedEdi.retryCount} lần
                  </div>
                </div>
              </div>

              {/* Raw EDI Payload Output */}
              <div>
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] mb-2">
                  Dữ liệu điện tín thô (UN/EDIFACT D.00B Segment Payload):
                </div>
                <pre className="p-4 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed border border-slate-800">
                  {getSimulatedEdifact(selectedEdi)}
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
    </div>
  );
};
