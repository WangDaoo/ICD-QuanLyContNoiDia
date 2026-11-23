import React, { useId, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ModalOverlay } from './ModalOverlay';
import { CommandNotice } from './useCommandAction';
import type { CommandResult } from '../services/api/operation';

export interface ConfirmSummaryRow {
  label: string;
  value: ReactNode;
}

interface ReasonField {
  label?: string;
  placeholder?: string;
  /** Minimum trimmed length; the confirm button stays disabled until met. Default 1. */
  minLength?: number;
}

interface ConfirmDialogProps {
  title: string;
  /** Short plain-language consequence, e.g. "Container sẽ chuyển sang Đã ra cổng và không thể hoàn tác." */
  message?: ReactNode;
  /** Key facts the operator must double-check before confirming. */
  summary?: ConfirmSummaryRow[];
  /** Ask for a mandatory reason (cancel / release / resolve). */
  reason?: ReasonField;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: 'danger' | 'primary';
  pending?: boolean;
  notice?: CommandResult | null;
  onConfirm: (reason: string) => void | Promise<unknown>;
  onClose: () => void;
  children?: ReactNode;
}

/**
 * In-app replacement for window.prompt/confirm on business commands.
 * Shows what will be affected, optionally collects a reason, and blocks double submit.
 * The backend still validates the command; this dialog only prevents operator mistakes.
 */
export function ConfirmDialog({
  title,
  message,
  summary = [],
  reason,
  confirmLabel,
  cancelLabel = 'Quay lại',
  tone = 'primary',
  pending = false,
  notice = null,
  onConfirm,
  onClose,
  children,
}: ConfirmDialogProps) {
  const titleId = useId();
  const reasonId = useId();
  const [reasonText, setReasonText] = useState('');
  const minLength = reason?.minLength ?? 1;
  const reasonMissing = Boolean(reason) && reasonText.trim().length < minLength;
  const confirmClass =
    tone === 'danger'
      ? 'bg-rose-700 hover:bg-rose-800 text-white'
      : 'bg-blue-700 hover:bg-blue-800 text-white';

  return (
    <ModalOverlay
      aria-labelledby={titleId}
      pending={pending}
      onClose={() => {
        if (!pending) onClose();
      }}
      className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4"
    >
      <form
        className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 text-sm space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || reasonMissing) return;
          void onConfirm(reasonText.trim());
        }}
      >
        <div className="flex items-start gap-3">
          {tone === 'danger' && (
            <AlertTriangle aria-hidden="true" className="w-5 h-5 shrink-0 text-rose-700 mt-0.5" />
          )}
          <div className="space-y-1">
            <h3 id={titleId} className="text-base font-bold text-slate-900">
              {title}
            </h3>
            {message && <div className="text-slate-700">{message}</div>}
          </div>
        </div>

        {summary.length > 0 && (
          <dl className="rounded-lg border border-slate-200 bg-slate-50 divide-y divide-slate-200">
            {summary.map((row) => (
              <div key={row.label} className="flex items-start justify-between gap-4 px-3 py-2">
                <dt className="text-slate-600">{row.label}</dt>
                <dd className="font-semibold text-slate-900 text-right break-all">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {children}

        {reason && (
          <div>
            <label htmlFor={reasonId} className="block font-semibold text-slate-700 mb-1">
              {reason.label ?? 'Lý do'}*
            </label>
            <textarea
              id={reasonId}
              required
              rows={3}
              value={reasonText}
              placeholder={reason.placeholder}
              onChange={(event) => setReasonText(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              aria-describedby={minLength > 1 ? `${reasonId}-hint` : undefined}
            />
            {minLength > 1 && (
              <p id={`${reasonId}-hint`} className="mt-1 text-caption text-slate-600">
                Nhập tối thiểu {minLength} ký tự để lưu vết xử lý.
              </p>
            )}
          </div>
        )}

        <CommandNotice notice={notice} />

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800 disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={pending || reasonMissing}
            aria-busy={pending || undefined}
            className={`px-4 py-2 rounded-lg font-semibold disabled:opacity-60 ${confirmClass}`}
          >
            {pending ? 'Đang xử lý…' : confirmLabel}
          </button>
        </div>
      </form>
    </ModalOverlay>
  );
}
