import React from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { readinessLabel } from '../services/readiness-labels';
import type { ReadinessCheck } from '../types';
import type { useBackendReadiness } from './useBackendReadiness';

/** A shortcut that takes the operator to the screen where a blocker is resolved. */
export interface ReadinessAction {
  label: string;
  onClick: () => void;
}

type ReadinessFlag = Exclude<keyof ReadinessCheck, 'blockers'>;

/**
 * Gate-out conditions in the order an operator resolves them.
 * Every value shown comes from the server readiness check; nothing is inferred here.
 */
export const READINESS_CONDITIONS: ReadonlyArray<{
  flag: ReadinessFlag;
  label: string;
  blockerCodes: readonly string[];
}> = [
  { flag: 'isContainerInYard', label: 'Container đang ở trong bãi', blockerCodes: ['CONTAINER_NOT_IN_YARD'] },
  { flag: 'hasYardPosition', label: 'Đã có vị trí trong bãi', blockerCodes: ['NO_YARD_POSITION'] },
  {
    flag: 'hasNoActiveYardOps',
    label: 'Không còn tác nghiệp bãi đang làm',
    blockerCodes: ['ACTIVE_YARD_OPERATION'],
  },
  {
    flag: 'hasNoInspectionHold',
    label: 'Không bị giữ để kiểm hóa / giám định',
    blockerCodes: ['INSPECTION_HOLD'],
  },
  { flag: 'hasNoOperationalHold', label: 'Không có lệnh giữ đang hiệu lực', blockerCodes: ['OPERATIONAL_HOLD'] },
  {
    flag: 'hasNoUnbilledServices',
    label: 'Mọi dịch vụ đã được tính phí',
    blockerCodes: ['UNBILLED_SERVICES'],
  },
  {
    flag: 'isBillingCompleted',
    label: 'Đã thanh toán đủ phí',
    blockerCodes: ['NO_BILLING', 'BILLING_INCOMPLETE', 'BILLING_CONFIGURATION_MISSING'],
  },
];

const KNOWN_BLOCKERS = new Set(READINESS_CONDITIONS.flatMap((condition) => condition.blockerCodes));

interface ReadinessNoticeProps {
  evaluation: ReturnType<typeof useBackendReadiness>;
  /**
   * Optional fix shortcut per blocker code, e.g. NO_YARD_POSITION → "Xếp vị trí bãi".
   * Return null when the current user cannot act on it.
   */
  resolveBlocker?: (code: string) => ReadinessAction | null | undefined;
}

function FixButton({ action }: { action: ReadinessAction | null | undefined }) {
  if (!action) return null;
  return (
    <button
      type="button"
      onClick={action.onClick}
      className="shrink-0 rounded-md border border-current px-2 py-0.5 text-caption font-semibold hover:bg-white/60"
    >
      {action.label}
    </button>
  );
}

export function ReadinessNotice({ evaluation, resolveBlocker }: ReadinessNoticeProps) {
  const { status, readiness, readinessError, retryReadiness } = evaluation;
  if (status === 'checking')
    return (
      <p role="status" className="text-slate-700">
        Đang kiểm tra điều kiện ra cổng…
      </p>
    );
  if (status === 'error')
    return (
      <div role="alert" className="text-rose-800">
        <p>
          {readinessError} Chưa xác định được container có đủ điều kiện ra cổng hay không.
        </p>
        <button type="button" onClick={retryReadiness} className="mt-2 underline font-semibold">
          Kiểm tra lại
        </button>
      </div>
    );
  if (!readiness)
    return (
      <p role="status" className="text-slate-700">
        Chọn container để kiểm tra điều kiện ra cổng.
      </p>
    );

  const blockers = readiness.blockers ?? [];
  const otherBlockers = blockers.filter((code) => !KNOWN_BLOCKERS.has(code));
  const failing = READINESS_CONDITIONS.filter(
    (condition) =>
      readiness[condition.flag] !== true ||
      condition.blockerCodes.some((code) => blockers.includes(code)),
  ).length;

  const heading =
    status === 'ready'
      ? 'Đủ điều kiện ra cổng. Hệ thống sẽ kiểm tra lại lần cuối khi cấp phiếu / xác nhận ra cổng.'
      : status === 'blocked'
        ? `Chưa đủ điều kiện ra cổng — còn ${failing + otherBlockers.length} việc cần xử lý:`
        : 'Hệ thống chưa xác nhận đủ điều kiện ra cổng.';

  return (
    <div
      role="status"
      className={status === 'ready' ? 'text-emerald-900' : status === 'blocked' ? 'text-amber-950' : 'text-slate-800'}
    >
      <p className="font-semibold">{heading}</p>
      <ul className="mt-2 space-y-1">
        {READINESS_CONDITIONS.map((condition) => {
          const matched = condition.blockerCodes.filter((code) => blockers.includes(code));
          const ok = readiness[condition.flag] === true && matched.length === 0;
          const detail = matched.map(readinessLabel).join(' ');
          const fix = ok ? null : resolveBlocker?.(matched[0] ?? condition.blockerCodes[0]);
          return (
            <li key={condition.flag} className="flex items-start justify-between gap-3">
              <span className="flex items-start gap-2">
                {ok ? (
                  <CheckCircle2 aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0 text-emerald-700" />
                ) : (
                  <XCircle aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0 text-rose-700" />
                )}
                <span>
                  <span className="sr-only">{ok ? 'Đạt: ' : 'Chưa đạt: '}</span>
                  {condition.label}
                  {!ok && detail && <span className="block text-caption opacity-90">{detail}</span>}
                </span>
              </span>
              <FixButton action={fix} />
            </li>
          );
        })}
        {otherBlockers.map((code) => (
          <li key={code} className="flex items-start justify-between gap-3">
            <span className="flex items-start gap-2">
              <XCircle aria-hidden="true" className="w-4 h-4 mt-0.5 shrink-0 text-rose-700" />
              <span>
                <span className="sr-only">Chưa đạt: </span>
                {readinessLabel(code)}
              </span>
            </span>
            <FixButton action={resolveBlocker?.(code)} />
          </li>
        ))}
      </ul>
      {status !== 'ready' && (
        <button type="button" onClick={retryReadiness} className="mt-2 underline font-semibold">
          Kiểm tra lại sau khi xử lý
        </button>
      )}
    </div>
  );
}
