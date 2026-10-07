import { useViewQueryState } from '../context/useViewQueryState';
import React from 'react';
import { useApp } from '../context/AppContext';
import { ShieldCheck, Search, User } from 'lucide-react';

import { CollectionState, ConfirmedResourceValue } from './CollectionState';

export const AuditsView: React.FC = () => {
  const { auditLogs } = useApp();
  const [searchTerm, setSearchTerm] = useViewQueryState('activity', 'search', '');

  const filteredLogs = auditLogs.filter(
    (log) =>
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entityId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <span>Nhật ký Kiểm toán & An ninh (Audit Logs)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận vết can thiệp nghiệp vụ (Ai đã làm gì, lúc nào, đối tượng và thông tin chi
            tiết)
          </p>
        </div>
        <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-lg font-semibold">
          <ConfirmedResourceValue resource="auditLogs">Tổng cộng: {auditLogs.length} bản ghi</ConfirmedResourceValue>
        </span>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-4 text-xs">
        <div className="relative w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            aria-label="Tìm nhật ký kiểm toán"
            placeholder="Tìm theo hành động, đối tượng, người thực hiện..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div role="region" aria-label="Nhật ký kiểm toán, cuộn ngang để xem các cột" tabIndex={0} className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
            <tr>
              <th className="py-3 px-4">Thời gian</th>
              <th className="py-3 px-4">Người thực hiện</th>
              <th className="py-3 px-4">Hành động</th>
              <th className="py-3 px-4">Đối tượng</th>
              <th className="py-3 px-4">Chi tiết nghiệp vụ</th>
              <th className="py-3 px-4 font-mono">Request ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td colSpan={6}>
                <CollectionState
                  resource="auditLogs"
                  count={filteredLogs.length}
                  total={auditLogs.length}
                  filtered={!!searchTerm}
                  onClear={() => setSearchTerm('')}
                />
              </td>
            </tr>
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-500 font-mono text-caption">
                  {new Date(log.timestamp).toLocaleString('vi-VN')}
                </td>
                <td className="py-3 px-4 font-bold text-slate-800">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{log.actor}</span>
                </td>
                <td className="py-3 px-4 font-mono font-bold text-blue-700">{log.action}</td>
                <td className="py-3 px-4">
                  <span className="font-semibold text-slate-700">{log.entityType}</span>:{' '}
                  <span className="font-mono text-slate-500">{log.entityId}</span>
                </td>
                <td className="py-3 px-4 text-slate-700 max-w-sm">{log.details}</td>
                <td className="py-3 px-4 font-mono text-slate-400 text-caption">{log.requestId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
