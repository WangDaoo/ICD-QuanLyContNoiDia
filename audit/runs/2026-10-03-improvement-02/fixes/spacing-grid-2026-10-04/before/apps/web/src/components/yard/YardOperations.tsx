import React, { useId, useRef, useState } from 'react';
import { ArrowRightLeft, CalendarDays, ClipboardCheck, Plus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ContainerInspection, InYardBooking, YardMovement } from '../../types';
import { ModalOverlay } from '../ModalOverlay';
import {
  canWriteYardOperation,
  findMovementDestinations,
  formatLocalDateTime,
  parseBookingCompletion,
  parseBookingSchedule,
  validateInspectionResult,
  type YardOperationAction,
} from './yard-operation-form';

export interface YardOperationsProps {
  initialVisitId?: string;
  initialAction?: YardOperationAction;
}

type OperationDialogState =
  | { kind: 'CREATE'; action: YardOperationAction }
  | { kind: 'COMPLETE_MOVE' | 'CANCEL_MOVE'; record: YardMovement }
  | { kind: 'COMPLETE_BOOKING' | 'CANCEL_BOOKING'; record: InYardBooking }
  | { kind: 'COMPLETE_INSPECTION'; record: ContainerInspection };

type Feedback = { kind: 'error' | 'success'; message: string } | null;
const INPUT_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100';
const ACTION_CLASS =
  'rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50';
const BOOKING_LABELS: Record<InYardBooking['bookingType'], string> = {
  STRIPPING: 'Rút hàng',
  STUFFING: 'Đóng hàng',
  INSPECTION: 'Kiểm định',
};
const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ thực hiện',
  IN_PROGRESS: 'Đang thực hiện',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: 'bg-amber-50 text-amber-800',
    IN_PROGRESS: 'bg-blue-50 text-blue-800',
    COMPLETED: 'bg-emerald-50 text-emerald-800',
    CANCELLED: 'bg-slate-100 text-slate-600',
  };
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2 py-1 text-caption font-semibold ${colors[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function formatOperationTime(value?: string) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '—'
    : date.toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh' });
}

function FeedbackMessage({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <div
      role={feedback.kind === 'error' ? 'alert' : 'status'}
      className={`rounded-lg border px-3 py-2 text-sm ${feedback.kind === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}
    >
      {feedback.message}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-xs font-semibold text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function OperationDialog({
  title,
  pending,
  onClose,
  children,
}: {
  title: string;
  pending: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const titleId = useId();
  return (
    <ModalOverlay pending={pending} onClose={onClose} aria-labelledby={titleId}>
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !pending) onClose();
      }}
    >
      <div
        aria-busy={pending}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 id={titleId} className="text-base font-bold text-slate-900">
            {title}
          </h3>
          <button
            type="button"
            aria-label="Đóng hộp thoại tác nghiệp"
            disabled={pending}
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
    </ModalOverlay>
  );
}

export const YardOperations: React.FC<YardOperationsProps> = ({
  initialVisitId,
  initialAction,
}) => {
  const app = useApp();
  const {
    currentUser,
    yardMovements,
    bookings,
    inspections,
    containerVisits,
    yardSlots,
    yardBlocks,
  } = app;
  const canMove = canWriteYardOperation(currentUser.permissionCodes, 'MOVE');
  const canBook = canWriteYardOperation(currentUser.permissionCodes, 'BOOKING');
  const canInspect = canWriteYardOperation(currentUser.permissionCodes, 'INSPECTION');
  const [dialog, setDialog] = useState<OperationDialogState | null>(() =>
    initialAction && canWriteYardOperation(currentUser.permissionCodes, initialAction)
      ? { kind: 'CREATE', action: initialAction }
      : null,
  );
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [visitFilter, setVisitFilter] = useState(initialVisitId ?? '');
  const [form, setForm] = useState({
    visitId: initialVisitId ?? '',
    toSlot: '',
    reason: '',
    bookingType: 'STRIPPING' as InYardBooking['bookingType'],
    scheduledAt: formatLocalDateTime(),
    notes: '',
    inspectionType: 'Hải quan' as ContainerInspection['inspectionType'],
  });
  const [completion, setCompletion] = useState({
    packages: '',
    weight: '',
    notes: '',
    result: 'PASS' as 'PASS' | 'FAIL' | 'HOLD',
  });
  const isWriteDisabled = pending || app.isLoading || !app.apiReady;
  const inYardVisits = containerVisits.filter((visit) => visit.state === 'IN_YARD');
  const moveVisits = inYardVisits.filter((visit) => !!visit.currentLocation);
  const selectedVisit = containerVisits.find((visit) => visit.id === form.visitId);
  const destinations = findMovementDestinations(yardSlots, yardBlocks, selectedVisit);
  const query = search.trim().toLocaleLowerCase('vi-VN');
  const matchesFilters = (record: {
    containerVisitId: string;
    containerNumber: string;
    status: string;
  }) =>
    (!visitFilter || record.containerVisitId === visitFilter) &&
    (!query || record.containerNumber?.toLocaleLowerCase('vi-VN').includes(query)) &&
    (statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE'
        ? ['PENDING', 'IN_PROGRESS'].includes(record.status)
        : record.status === statusFilter));
  const movementsToShow = yardMovements.filter(matchesFilters);
  const bookingsToShow = bookings.filter(matchesFilters);
  const inspectionsToShow = inspections.filter(matchesFilters);
  const failValidation = (message: string) => setFeedback({ kind: 'error', message });
  const openCreate = (action: YardOperationAction) => {
    if (!canWriteYardOperation(currentUser.permissionCodes, action) || isWriteDisabled) return;
    setFeedback(null);
    setForm({
      ...form,
      visitId: visitFilter || initialVisitId || '',
      toSlot: '',
      reason: '',
      scheduledAt: formatLocalDateTime(),
      notes: '',
    });
    setDialog({ kind: 'CREATE', action });
  };
  const openRecordDialog = (next: Exclude<OperationDialogState, { kind: 'CREATE' }>) => {
    setFeedback(null);
    setForm({ ...form, reason: '' });
    setCompletion({ packages: '', weight: '', notes: '', result: 'PASS' });
    if (next.kind === 'COMPLETE_BOOKING') {
      const record = next.record as InYardBooking & { conditionNotes?: string };
      setCompletion({
        packages: record.actualPackages == null ? '' : String(record.actualPackages),
        weight: record.actualWeightKg == null ? '' : String(record.actualWeightKg),
        notes: record.notes ?? record.conditionNotes ?? '',
        result: 'PASS',
      });
    }
    if (next.kind === 'COMPLETE_INSPECTION')
      setCompletion({ packages: '', weight: '', notes: next.record.notes ?? '', result: 'PASS' });
    setDialog(next);
  };
  const runCommand = async (
    action: YardOperationAction,
    command: () => Promise<{ success: boolean; message: string }>,
    successMessage: string,
    shouldClose = false,
  ) => {
    if (pendingRef.current) return;
    if (!canWriteYardOperation(currentUser.permissionCodes, action)) {
      failValidation('Bạn không có quyền thực hiện tác nghiệp này.');
      return;
    }
    if (!app.apiReady || app.isLoading) {
      failValidation('Dữ liệu hệ thống chưa sẵn sàng. Vui lòng thử lại sau khi tải xong.');
      return;
    }
    pendingRef.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const result = await command();
      if (!result.success) failValidation(result.message);
      else {
        setFeedback({ kind: 'success', message: `${successMessage} ${result.message}`.trim() });
        if (shouldClose) setDialog(null);
      }
    } catch (error) {
      failValidation(
        error instanceof Error ? error.message : 'Không thể lưu tác nghiệp. Vui lòng thử lại.',
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dialog || pendingRef.current) return;
    if (dialog.kind === 'CREATE') {
      if (!selectedVisit || selectedVisit.state !== 'IN_YARD') {
        failValidation('Vui lòng chọn container đang ở trạng thái IN_YARD.');
        return;
      }
      if (dialog.action === 'MOVE') {
        if (!selectedVisit.currentLocation) {
          failValidation('Container chưa có vị trí hiện tại để di chuyển.');
          return;
        }
        if (!destinations.some((slot) => slot.slotCode === form.toSlot)) {
          failValidation('Vui lòng chọn vị trí đích trống và đang hoạt động.');
          return;
        }
        if (!form.reason.trim()) {
          failValidation('Vui lòng nhập lý do di chuyển.');
          return;
        }
        await runCommand(
          'MOVE',
          () => app.createYardMovement(form.visitId, form.toSlot, form.reason.trim()),
          'Đã tạo lệnh di chuyển.',
          true,
        );
      } else if (dialog.action === 'BOOKING') {
        const schedule = parseBookingSchedule(new FormData(event.currentTarget));
        if (schedule.error || !schedule.iso) {
          failValidation(schedule.error ?? 'Vui lòng nhập thời gian dự kiến.');
          return;
        }
        await runCommand(
          'BOOKING',
          () =>
            app.createYardBooking(
              form.visitId,
              form.bookingType,
              schedule.iso!,
              form.notes.trim() || undefined,
            ),
          'Đã đặt lịch tác nghiệp bãi.',
          true,
        );
      } else {
        await runCommand(
          'INSPECTION',
          () =>
            app.createInspection(form.visitId, form.inspectionType, form.notes.trim() || undefined),
          'Đã tạo yêu cầu kiểm định.',
          true,
        );
      }
    } else if (dialog.kind === 'CANCEL_MOVE' || dialog.kind === 'CANCEL_BOOKING') {
      if (!form.reason.trim()) {
        failValidation('Vui lòng nhập lý do hủy tác nghiệp.');
        return;
      }
      if (dialog.kind === 'CANCEL_MOVE')
        await runCommand(
          'MOVE',
          () => app.cancelYardMovement(dialog.record.id, form.reason.trim()),
          'Đã hủy lệnh di chuyển.',
          true,
        );
      else
        await runCommand(
          'BOOKING',
          () => app.cancelYardBooking(dialog.record.id, form.reason.trim()),
          'Đã hủy lịch tác nghiệp.',
          true,
        );
    } else if (dialog.kind === 'COMPLETE_MOVE') {
      await runCommand(
        'MOVE',
        () => app.completeYardMovement(dialog.record.id),
        'Đã hoàn tất di chuyển và cập nhật vị trí bãi.',
        true,
      );
    } else if (dialog.kind === 'COMPLETE_BOOKING') {
      const parsed = parseBookingCompletion(
        completion.packages,
        completion.weight,
        completion.notes,
      );
      if (parsed.error || !parsed.values) {
        failValidation(parsed.error ?? 'Kết quả tác nghiệp không hợp lệ.');
        return;
      }
      const values = parsed.values;
      await runCommand(
        'BOOKING',
        () =>
          app.completeYardBooking(
            dialog.record.id,
            values.actualPackages,
            values.actualWeightKg,
            values.conditionNotes,
          ),
        'Đã ghi nhận kết quả tác nghiệp.',
        true,
      );
    } else {
      const error = validateInspectionResult(completion.result, completion.notes);
      if (error) {
        failValidation(error);
        return;
      }
      await runCommand(
        'INSPECTION',
        () =>
          app.completeInspection(
            dialog.record.id,
            completion.result,
            completion.notes.trim() || undefined,
          ),
        'Đã ghi nhận kết quả kiểm định.',
        true,
      );
    }
  };

  const dialogTitle = !dialog
    ? ''
    : dialog.kind === 'CREATE'
      ? {
          MOVE: 'Tạo lệnh đảo chuyển',
          BOOKING: 'Đặt lịch tác nghiệp bãi',
          INSPECTION: 'Tạo yêu cầu kiểm định',
        }[dialog.action]
      : {
          COMPLETE_MOVE: 'Xác nhận hoàn tất di chuyển',
          CANCEL_MOVE: 'Hủy lệnh di chuyển',
          COMPLETE_BOOKING: 'Ghi nhận kết quả tác nghiệp',
          CANCEL_BOOKING: 'Hủy lịch tác nghiệp',
          COMPLETE_INSPECTION: 'Ghi nhận kết quả kiểm định',
        }[dialog.kind];
  const activeCount = [...yardMovements, ...bookings, ...inspections].filter((record) =>
    ['PENDING', 'IN_PROGRESS'].includes(record.status),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-bold text-slate-900">Tác nghiệp bãi</h3>
          <p className="mt-1 text-xs text-slate-500">
            {activeCount} tác nghiệp đang chờ hoặc đang thực hiện. Trạng thái và vị trí được cập
            nhật từ hệ thống.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canMove && (
            <button
              type="button"
              disabled={isWriteDisabled}
              onClick={() => openCreate('MOVE')}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-3.5 w-3.5" />
              Tạo lệnh đảo chuyển
            </button>
          )}
          {canBook && (
            <button
              type="button"
              disabled={isWriteDisabled}
              onClick={() => openCreate('BOOKING')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Đặt lịch trong bãi
            </button>
          )}
          {canInspect && (
            <button
              type="button"
              disabled={isWriteDisabled}
              onClick={() => openCreate('INSPECTION')}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50"
            >
              <ClipboardCheck className="h-3.5 w-3.5" />
              Tạo yêu cầu kiểm định
            </button>
          )}
        </div>
      </div>
      {!dialog && <FeedbackMessage feedback={feedback} />}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
        <FormField label="Tìm container">
          <input
            type="search"
            aria-label="Tìm container trong tác nghiệp"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Mã container..."
            className={INPUT_CLASS}
          />
        </FormField>
        <FormField label="Container">
          <select
            aria-label="Lọc tác nghiệp theo container"
            value={visitFilter}
            onChange={(event) => setVisitFilter(event.target.value)}
            className={INPUT_CLASS}
          >
            <option value="">Tất cả container</option>
            {containerVisits.map((visit) => (
              <option key={visit.id} value={visit.id}>
                {visit.containerNumber}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Trạng thái">
          <select
            aria-label="Lọc trạng thái tác nghiệp"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            className={INPUT_CLASS}
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang chờ / Đang thực hiện</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <section
        className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-label="Di chuyển nội bãi"
      >
        <h4 className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-900">
          <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          Di chuyển nội bãi{' '}
          <span className="font-normal text-slate-500">({movementsToShow.length})</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Container</th>
                <th className="px-4 py-3">Từ / Đến</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Lý do / Thời gian</th>
                {canMove && <th className="px-4 py-3">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {movementsToShow.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                    {record.containerNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="whitespace-nowrap">
                      {record.fromSlot} → {record.toSlot}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">
                    <div className="break-words">{record.reason || '—'}</div>
                    <div className="mt-1 whitespace-nowrap text-caption text-slate-400">
                      {formatOperationTime(record.completedAt ?? record.createdAt)}
                    </div>
                  </td>
                  {canMove && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {record.status === 'PENDING' && (
                          <button
                            type="button"
                            aria-label={`Bắt đầu di chuyển ${record.containerNumber}`}
                            disabled={isWriteDisabled}
                            onClick={() =>
                              void runCommand(
                                'MOVE',
                                () => app.startYardMovement(record.id),
                                'Đã bắt đầu di chuyển.',
                              )
                            }
                            className={ACTION_CLASS}
                          >
                            Bắt đầu
                          </button>
                        )}
                        {record.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            aria-label={`Hoàn tất di chuyển ${record.containerNumber}`}
                            disabled={isWriteDisabled}
                            onClick={() => openRecordDialog({ kind: 'COMPLETE_MOVE', record })}
                            className={ACTION_CLASS}
                          >
                            Hoàn tất
                          </button>
                        )}
                        {['PENDING', 'IN_PROGRESS'].includes(record.status) && (
                          <button
                            type="button"
                            aria-label={`Hủy di chuyển ${record.containerNumber}`}
                            disabled={isWriteDisabled}
                            onClick={() => openRecordDialog({ kind: 'CANCEL_MOVE', record })}
                            className={`${ACTION_CLASS} text-red-700`}
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!movementsToShow.length && (
                <tr>
                  <td colSpan={canMove ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                    Chưa có lệnh di chuyển phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-label="Lịch tác nghiệp bãi"
      >
        <h4 className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-900">
          <CalendarDays className="h-4 w-4 text-blue-600" />
          Lịch tác nghiệp bãi{' '}
          <span className="font-normal text-slate-500">({bookingsToShow.length})</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Container / Loại</th>
                <th className="px-4 py-3">Lịch dự kiến</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Kết quả / Ghi chú</th>
                {canBook && <th className="px-4 py-3">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookingsToShow.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-slate-900">
                      {record.containerNumber}
                    </div>
                    <div className="mt-1 text-slate-500">{BOOKING_LABELS[record.bookingType]}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {formatOperationTime(record.scheduledAt)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="max-w-xs px-4 py-3 text-slate-600">
                    <div>
                      {record.actualPackages != null ? `${record.actualPackages} kiện` : '—'} ·{' '}
                      {record.actualWeightKg != null
                        ? `${record.actualWeightKg.toLocaleString('vi-VN')} kg`
                        : '—'}
                    </div>
                    <div className="mt-1 break-words text-caption">
                      {record.notes ??
                        (record as InYardBooking & { conditionNotes?: string }).conditionNotes ??
                        '—'}
                    </div>
                    {record.completedAt && (
                      <div className="mt-1 text-caption text-slate-400">
                        Hoàn tất: {formatOperationTime(record.completedAt)}
                      </div>
                    )}
                  </td>
                  {canBook && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {record.status === 'PENDING' && (
                          <button
                            type="button"
                            aria-label={`Bắt đầu booking ${record.containerNumber}`}
                            disabled={isWriteDisabled}
                            onClick={() =>
                              void runCommand(
                                'BOOKING',
                                () => app.startYardBooking(record.id),
                                'Đã bắt đầu tác nghiệp.',
                              )
                            }
                            className={ACTION_CLASS}
                          >
                            Bắt đầu
                          </button>
                        )}
                        {record.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            aria-label={`Hoàn tất booking ${record.containerNumber}`}
                            disabled={isWriteDisabled}
                            onClick={() => openRecordDialog({ kind: 'COMPLETE_BOOKING', record })}
                            className={ACTION_CLASS}
                          >
                            Ghi nhận kết quả
                          </button>
                        )}
                        {['PENDING', 'IN_PROGRESS'].includes(record.status) && (
                          <button
                            type="button"
                            aria-label={`Hủy booking ${record.containerNumber}`}
                            disabled={isWriteDisabled}
                            onClick={() => openRecordDialog({ kind: 'CANCEL_BOOKING', record })}
                            className={`${ACTION_CLASS} text-red-700`}
                          >
                            Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!bookingsToShow.length && (
                <tr>
                  <td colSpan={canBook ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                    Chưa có lịch tác nghiệp phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white"
        aria-label="Kiểm định container"
      >
        <h4 className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 text-sm font-bold text-slate-900">
          <ClipboardCheck className="h-4 w-4 text-blue-600" />
          Kiểm định container{' '}
          <span className="font-normal text-slate-500">({inspectionsToShow.length})</span>
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Container / Loại</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-4 py-3">Kết quả / Ghi chú</th>
                <th className="px-4 py-3">Nhân viên / Thời gian</th>
                {canInspect && <th className="px-4 py-3">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inspectionsToShow.map((record) => (
                <tr key={record.id}>
                  <td className="px-4 py-3">
                    <div className="font-mono font-semibold text-slate-900">
                      {record.containerNumber}
                    </div>
                    <div className="mt-1 text-slate-500">{record.inspectionType}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={record.status} />
                  </td>
                  <td className="max-w-xs px-4 py-3">
                    <div
                      className={`font-semibold ${record.result === 'HOLD' ? 'text-amber-800' : record.result === 'FAIL' ? 'text-red-700' : 'text-slate-700'}`}
                    >
                      {record.result ?? 'Chưa có kết quả'}
                    </div>
                    <div className="mt-1 break-words text-slate-500">{record.notes || '—'}</div>
                    {record.documentUrl && (
                      <a
                        href={record.documentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block text-blue-700 underline"
                      >
                        Xem biên bản
                      </a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <div>{record.inspectorName || '—'}</div>
                    <div className="mt-1 whitespace-nowrap text-caption text-slate-400">
                      {formatOperationTime(record.inspectedAt)}
                    </div>
                  </td>
                  {canInspect && (
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        {record.status === 'PENDING' && (
                          <button
                            type="button"
                            aria-label={`Bắt đầu kiểm định ${record.containerNumber}`}
                            disabled={isWriteDisabled}
                            onClick={() =>
                              void runCommand(
                                'INSPECTION',
                                () => app.startInspection(record.id),
                                'Đã bắt đầu kiểm định.',
                              )
                            }
                            className={ACTION_CLASS}
                          >
                            Bắt đầu
                          </button>
                        )}
                        {record.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            aria-label={`Ghi nhận kết quả kiểm định ${record.containerNumber}`}
                            disabled={isWriteDisabled}
                            onClick={() =>
                              openRecordDialog({ kind: 'COMPLETE_INSPECTION', record })
                            }
                            className={ACTION_CLASS}
                          >
                            Ghi nhận kết quả
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {!inspectionsToShow.length && (
                <tr>
                  <td colSpan={canInspect ? 5 : 4} className="px-4 py-8 text-center text-slate-500">
                    Chưa có yêu cầu kiểm định phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {dialog && (
        <OperationDialog title={dialogTitle} pending={pending} onClose={() => setDialog(null)}>
          <form onSubmit={(event) => void handleSubmit(event)} noValidate className="space-y-4">
            <FeedbackMessage feedback={feedback} />
            {dialog.kind !== 'CREATE' && (
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                Container: {dialog.record.containerNumber}
              </p>
            )}
            <fieldset disabled={isWriteDisabled} className="space-y-4 disabled:opacity-70">
              {dialog.kind === 'CREATE' && (
                <>
                  <FormField label="Container *">
                    <select
                      aria-label="Container tác nghiệp"
                      aria-required="true"
                      value={form.visitId}
                      onChange={(event) =>
                        setForm({ ...form, visitId: event.target.value, toSlot: '' })
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="">— Chọn container —</option>
                      {(dialog.action === 'MOVE' ? moveVisits : inYardVisits).map((visit) => (
                        <option key={visit.id} value={visit.id}>
                          {visit.containerNumber}
                          {dialog.action === 'MOVE' ? ` · ${visit.currentLocation}` : ''}
                        </option>
                      ))}
                    </select>
                  </FormField>
                  {!(dialog.action === 'MOVE' ? moveVisits : inYardVisits).length && (
                    <p className="text-xs text-amber-800">
                      Chưa có container IN_YARD phù hợp để tạo tác nghiệp.
                    </p>
                  )}
                  {dialog.action === 'MOVE' && (
                    <>
                      {selectedVisit?.currentLocation && (
                        <p className="text-xs text-slate-500">
                          Vị trí hiện tại: <strong>{selectedVisit.currentLocation}</strong>
                        </p>
                      )}
                      <FormField label="Vị trí đích *">
                        <select
                          aria-label="Vị trí đích di chuyển"
                          aria-required="true"
                          value={form.toSlot}
                          onChange={(event) => setForm({ ...form, toSlot: event.target.value })}
                          className={INPUT_CLASS}
                        >
                          <option value="">— Chọn vị trí trống —</option>
                          {destinations.map((slot) => (
                            <option key={slot.id} value={slot.slotCode}>
                              {slot.slotCode}
                              {slot.reeferPower ? ' · Điện lạnh' : ''}
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <p className="text-xs text-slate-500">
                        Chỉ hiển thị vị trí trống và đang hoạt động. Hệ thống kiểm tra loại, tải
                        trọng và điện lạnh khi lưu.
                      </p>
                      <FormField label="Lý do di chuyển *">
                        <textarea
                          aria-label="Lý do di chuyển"
                          aria-required="true"
                          maxLength={255}
                          rows={3}
                          value={form.reason}
                          onChange={(event) => setForm({ ...form, reason: event.target.value })}
                          className={INPUT_CLASS}
                        />
                      </FormField>
                    </>
                  )}
                  {dialog.action === 'BOOKING' && (
                    <>
                      <FormField label="Loại tác nghiệp">
                        <select
                          aria-label="Loại booking"
                          value={form.bookingType}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              bookingType: event.target.value as InYardBooking['bookingType'],
                            })
                          }
                          className={INPUT_CLASS}
                        >
                          {Object.entries(BOOKING_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label} ({value})
                            </option>
                          ))}
                        </select>
                      </FormField>
                      <FormField label="Thời gian dự kiến *">
                        <input
                          type="datetime-local"
                          name="scheduledAt"
                          aria-label="Thời gian dự kiến"
                          aria-required="true"
                          value={form.scheduledAt}
                          onChange={(event) => {
                            const scheduledAt = event.currentTarget.value;
                            setForm((current) => ({ ...current, scheduledAt }));
                          }}
                          onInput={(event) => {
                            const scheduledAt = event.currentTarget.value;
                            setForm((current) => ({ ...current, scheduledAt }));
                          }}
                          className={INPUT_CLASS}
                        />
                      </FormField>
                      <p className="text-xs text-slate-500">
                        Ngày giờ theo giờ Việt Nam (UTC+7).
                      </p>
                    </>
                  )}
                  {dialog.action === 'INSPECTION' && (
                    <FormField label="Loại kiểm định">
                      <select
                        aria-label="Loại kiểm định"
                        value={form.inspectionType}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            inspectionType: event.target
                              .value as ContainerInspection['inspectionType'],
                          })
                        }
                        className={INPUT_CLASS}
                      >
                        {(['Hải quan', 'Nội bộ', 'Kiểm dịch'] as const).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </FormField>
                  )}
                  {dialog.action !== 'MOVE' && (
                    <FormField label="Ghi chú">
                      <textarea
                        aria-label="Ghi chú tác nghiệp"
                        rows={3}
                        value={form.notes}
                        onChange={(event) => setForm({ ...form, notes: event.target.value })}
                        className={INPUT_CLASS}
                      />
                    </FormField>
                  )}
                </>
              )}
              {(dialog.kind === 'CANCEL_MOVE' || dialog.kind === 'CANCEL_BOOKING') && (
                <FormField label="Lý do hủy *">
                  <textarea
                    aria-label="Lý do hủy tác nghiệp"
                    aria-required="true"
                    maxLength={255}
                    rows={3}
                    value={form.reason}
                    onChange={(event) => setForm({ ...form, reason: event.target.value })}
                    className={INPUT_CLASS}
                  />
                </FormField>
              )}
              {dialog.kind === 'COMPLETE_MOVE' && (
                <p className="text-sm text-slate-600">
                  Xác nhận container đã được di chuyển từ <strong>{dialog.record.fromSlot}</strong>{' '}
                  đến <strong>{dialog.record.toSlot}</strong>. Hệ thống sẽ cập nhật vị trí hiện tại
                  và tình trạng hai slot.
                </p>
              )}
              {dialog.kind === 'COMPLETE_BOOKING' && (
                <>
                  <p className="text-xs text-slate-500">
                    Tác nghiệp: {BOOKING_LABELS[dialog.record.bookingType]}. Ghi nhận số kiện, trọng
                    lượng và tình trạng hàng thực tế.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField label="Số kiện thực tế">
                      <input
                        type="number"
                        aria-label="Số kiện thực tế"
                        min="0"
                        step="1"
                        value={completion.packages}
                        onChange={(event) =>
                          setCompletion({ ...completion, packages: event.target.value })
                        }
                        className={INPUT_CLASS}
                      />
                    </FormField>
                    <FormField label="Trọng lượng thực tế (kg)">
                      <input
                        type="number"
                        aria-label="Trọng lượng thực tế (kg)"
                        min="0"
                        step="0.001"
                        value={completion.weight}
                        onChange={(event) =>
                          setCompletion({ ...completion, weight: event.target.value })
                        }
                        className={INPUT_CLASS}
                      />
                    </FormField>
                  </div>
                  <FormField label="Tình trạng hàng / Ghi chú kết quả">
                    <textarea
                      aria-label="Tình trạng hàng và ghi chú kết quả"
                      rows={3}
                      value={completion.notes}
                      onChange={(event) =>
                        setCompletion({ ...completion, notes: event.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </FormField>
                </>
              )}
              {dialog.kind === 'COMPLETE_INSPECTION' && (
                <>
                  <FormField label="Kết quả kiểm định *">
                    <select
                      aria-label="Kết quả kiểm định"
                      value={completion.result}
                      onChange={(event) =>
                        setCompletion({
                          ...completion,
                          result: event.target.value as 'PASS' | 'FAIL' | 'HOLD',
                        })
                      }
                      className={INPUT_CLASS}
                    >
                      <option value="PASS">PASS — Đạt</option>
                      <option value="FAIL">FAIL — Không đạt</option>
                      <option value="HOLD">HOLD — Chờ xử lý</option>
                    </select>
                  </FormField>
                  <FormField
                    label={completion.result === 'PASS' ? 'Ghi chú kết quả' : 'Ghi chú kết quả *'}
                  >
                    <textarea
                      aria-label="Ghi chú kết quả kiểm định"
                      aria-required={completion.result !== 'PASS'}
                      rows={3}
                      value={completion.notes}
                      onChange={(event) =>
                        setCompletion({ ...completion, notes: event.target.value })
                      }
                      className={INPUT_CLASS}
                    />
                  </FormField>
                  {completion.result === 'HOLD' && (
                    <p className="text-xs text-amber-800">
                      Kết quả HOLD sẽ được hệ thống ghi nhận và có thể chặn cấp phiếu ra cổng cho
                      đến khi được xử lý.
                    </p>
                  )}
                </>
              )}
            </fieldset>
            <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                disabled={pending}
                onClick={() => setDialog(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={isWriteDisabled}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending
                  ? 'Đang lưu...'
                  : dialog.kind === 'CREATE'
                    ? 'Tạo tác nghiệp'
                    : dialog.kind.startsWith('CANCEL')
                      ? 'Xác nhận hủy'
                      : 'Xác nhận hoàn tất'}
              </button>
            </div>
          </form>
        </OperationDialog>
      )}
    </div>
  );
};
