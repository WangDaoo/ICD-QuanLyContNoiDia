import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { WorkQueueTask, TaskUrgency } from '../types';
import {
  ListTodo,
  Clock,
  ArrowRight,
  Filter,
  CheckCircle2,
} from 'lucide-react';
import { taskDestination, type NavigationContext } from '../navigation';
import { useViewQueryState } from '../context/useViewQueryState';
import { CollectionState, ConfirmedResourceValue } from './CollectionState';
import { NavTabId } from './Sidebar';

interface WorkQueueViewProps {
  onNavigate: (tab: NavTabId, contextId?: string, context?: NavigationContext) => void;
}

export const WorkQueueView: React.FC<WorkQueueViewProps> = ({
  onNavigate,
}) => {
  const { workQueue, currentUser } = useApp();

  const [urgencyFilter, setUrgencyFilter] = useViewQueryState('work-queue', 'urgency', 'ALL');
  const [taskTypeFilter, setTaskTypeFilter] = useViewQueryState('work-queue', 'type', 'ALL');
  const [filterMyRoleOnly, setFilterMyRoleOnly] = useState<boolean>(false);

  const filteredTasks = workQueue.filter((task) => {
    if (urgencyFilter !== 'ALL' && task.urgency !== urgencyFilter) return false;
    if (taskTypeFilter !== 'ALL' && task.taskType !== taskTypeFilter) return false;
    if (filterMyRoleOnly && !task.assignedRoles.some(role => (currentUser.roleCodes ?? [currentUser.role]).includes(role))) return false;
    return true;
  });

  const getUrgencyBadge = (urgency: TaskUrgency) => {
    switch (urgency) {
      case 'OVERDUE':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">QUÁ HẠN</span>;
      case 'HIGH':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">ƯU TIÊN CAO</span>;
      case 'MEDIUM':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 border border-yellow-300">TRUNG BÌNH</span>;
      case 'NORMAL':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">BÌNH THƯỜNG</span>;
    }
  };

  const handleAction = (task: WorkQueueTask) => {
    const destination = taskDestination(task);
    onNavigate(destination.tab, undefined, destination.context);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <ListTodo className="w-5 h-5 text-blue-600" />
            <span>Danh sách công việc thông minh (Work Queue)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Tự động sắp xếp các tác vụ theo mức độ khẩn cấp (Urgency) và cam kết thời gian hoàn thành (SLA)
          </p>
        </div>

        {/* Quick Urgency counters */}
        <div className="flex items-center space-x-2 text-xs text-slate-500">
          <ConfirmedResourceValue resource="workQueue">
          <div className="px-3 py-1 bg-rose-50 border border-rose-200 rounded-lg text-xs">
            <span className="text-rose-700 font-bold">{workQueue.filter((t) => t.urgency === 'OVERDUE').length}</span> Quá hạn
          </div>
          <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-xs">
            <span className="text-amber-800 font-bold">{workQueue.filter((t) => t.urgency === 'HIGH').length}</span> Ưu tiên cao
          </div>
          <div className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs">
            <span className="text-blue-600 font-bold">{workQueue.length}</span> Tổng việc
          </div>
          </ConfirmedResourceValue>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-slate-600 flex items-center">
            <Filter className="w-3.5 h-3.5 mr-1" /> Bộ lọc:
          </span>

          <select
            aria-label="Mức độ khẩn cấp"
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">Tất cả mức độ khẩn cấp</option>
            <option value="OVERDUE">Quá hạn (OVERDUE)</option>
            <option value="HIGH">Ưu tiên cao (HIGH)</option>
            <option value="MEDIUM">Trung bình (MEDIUM)</option>
            <option value="NORMAL">Bình thường (NORMAL)</option>
          </select>

          <select
            aria-label="Loại nghiệp vụ"
            value={taskTypeFilter}
            onChange={(e) => setTaskTypeFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-2.5 py-1.5 bg-slate-50 text-slate-700 font-medium"
          >
            <option value="ALL">Tất cả loại nghiệp vụ</option>
            <option value="GATE_IN">Tiếp nhận vào cổng (Gate-in)</option>
            <option value="YARD_ASSIGN">Xếp vị trí bãi (Yard Assign)</option>
            <option value="BILLING">Thu phí dịch vụ (Billing)</option>
            <option value="GATE_OUT">Xác nhận ra cổng (Gate-out)</option>
            <option value="HANDOVER_REVIEW">Duyệt bàn giao đối tác (Review POD)</option>
          </select>

          <label className="flex items-center space-x-1.5 cursor-pointer ml-2 text-slate-700 select-none">
            <input
              type="checkbox"
              checked={filterMyRoleOnly}
              onChange={(e) => setFilterMyRoleOnly(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span>Chỉ việc thuộc vai trò của tôi ({currentUser.role})</span>
          </label>
        </div>

        <span className="text-slate-400">
          <ConfirmedResourceValue resource="workQueue">Hiển thị {filteredTasks.length} / {workQueue.length} tác vụ</ConfirmedResourceValue>
        </span>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        <CollectionState resource="workQueue" count={filteredTasks.length} total={workQueue.length} filtered={urgencyFilter !== 'ALL' || taskTypeFilter !== 'ALL' || filterMyRoleOnly} onClear={() => { setUrgencyFilter('ALL'); setTaskTypeFilter('ALL'); setFilterMyRoleOnly(false); }} />
        {filteredTasks.length === 0 ? (
          <ConfirmedResourceValue resource="workQueue" unavailable={null}>
          <div className="bg-white p-12 text-center rounded-xl border border-slate-200 shadow-xs">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <h3 className="text-base font-bold text-slate-800">Không có công việc nào cần xử lý</h3>
            <p className="text-xs text-slate-500 mt-1">
              Toàn bộ các tác vụ theo tiêu chí lọc hiện tại đã được giải quyết hoặc chưa phát sinh.
            </p>
          </div>
          </ConfirmedResourceValue>
        ) : (
          filteredTasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white p-4 rounded-xl border transition shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                task.urgency === 'OVERDUE'
                  ? 'border-rose-300 bg-rose-50/20'
                  : task.urgency === 'HIGH'
                  ? 'border-amber-300 bg-amber-50/10'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="flex items-start space-x-3.5">
                <div className="pt-0.5">{getUrgencyBadge(task.urgency)}</div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-bold text-slate-900">{task.title}</span>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                      {task.containerNumber}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1">{task.subtitle}</p>
                  <div className="flex items-center space-x-4 mt-2 text-caption text-slate-400">
                    <span className="flex items-center text-slate-500">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      Thời hạn: <strong className="ml-1 text-slate-700">{task.timeRemainingText}</strong>
                    </span>
                    <span>
                      Vai trò xử lý: <strong className="text-slate-600">{task.assignedRoles.join(', ')}</strong>
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 flex items-center space-x-2">
                <button
                  onClick={() => handleAction(task)}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition shadow-xs flex items-center space-x-1.5 ${
                    task.urgency === 'OVERDUE'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <span>Thực hiện tác vụ</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
