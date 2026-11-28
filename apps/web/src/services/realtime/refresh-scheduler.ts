import { planRealtimeRefresh, type RealtimeChangeMessage, type RefreshScope } from './refresh-plan';

export interface RefreshSchedulerOptions {
  run: (scope: RefreshScope) => Promise<void>;
  /** Tab đang hiển thị; tab ẩn chỉ ghi nhận thay đổi, đến khi hiện lại mới tải. */
  isVisible: () => boolean;
  /** Chờ thêm sự kiện cùng đợt trước khi tải (một thao tác có thể phát nhiều sự kiện). */
  debounceMs?: number;
  /** Thời gian gom tối đa khi sự kiện đến liên tục, tránh hoãn tải mãi. */
  maxDebounceMs?: number;
  /** Khoảng cách tối thiểu giữa hai lần tải nền. */
  minIntervalMs?: number;
  /** Khoảng cách tối thiểu giữa hai lần tải nền toàn bộ (nặng hơn nhiều). */
  fullMinIntervalMs?: number;
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface RefreshScheduler {
  push(change: RealtimeChangeMessage): void;
  /** Gọi khi `document.visibilityState` đổi. */
  visibilityChanged(): void;
  /** Số sự kiện đang chờ tải (dùng cho kiểm thử và hiển thị). */
  pendingCount(): number;
  dispose(): void;
}

export const REALTIME_DEBOUNCE_MS = 800;
export const REALTIME_MAX_DEBOUNCE_MS = 2_000;
export const REALTIME_MIN_INTERVAL_MS = 3_000;
export const REALTIME_FULL_MIN_INTERVAL_MS = 15_000;

/**
 * Gom sự kiện realtime và chạy tối đa một lần tải nền tại một thời điểm,
 * giới hạn tần suất để Web và Mobile dùng chung IP không chạm ngưỡng throttle.
 */
export function createRefreshScheduler(options: RefreshSchedulerOptions): RefreshScheduler {
  const debounceMs = options.debounceMs ?? REALTIME_DEBOUNCE_MS;
  const maxDebounceMs = Math.max(options.maxDebounceMs ?? REALTIME_MAX_DEBOUNCE_MS, debounceMs);
  const minIntervalMs = options.minIntervalMs ?? REALTIME_MIN_INTERVAL_MS;
  const fullMinIntervalMs = options.fullMinIntervalMs ?? REALTIME_FULL_MIN_INTERVAL_MS;
  const now = options.now ?? (() => Date.now());
  const setTimer = options.setTimer ?? ((callback: () => void, ms: number) => setTimeout(callback, ms));
  const clearTimer = options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let pending: RealtimeChangeMessage[] = [];
  let firstPendingAt = 0;
  let timer: unknown = null;
  let running = false;
  let disposed = false;
  let lastRunAt = Number.NEGATIVE_INFINITY;
  let lastFullAt = Number.NEGATIVE_INFINITY;

  const cancelTimer = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const schedule = () => {
    if (disposed || running || pending.length === 0 || !options.isVisible()) return;
    const scope = planRealtimeRefresh(pending);
    const current = now();
    let due = Math.max(
      Math.min(current + debounceMs, firstPendingAt + maxDebounceMs),
      lastRunAt + minIntervalMs,
    );
    if (scope?.full) due = Math.max(due, lastFullAt + fullMinIntervalMs);
    cancelTimer();
    timer = setTimer(flush, Math.max(0, due - current));
  };

  const flush = () => {
    timer = null;
    if (disposed || running || pending.length === 0) return;
    if (!options.isVisible()) return;
    const scope = planRealtimeRefresh(pending);
    pending = [];
    if (!scope) return;
    running = true;
    const startedAt = now();
    lastRunAt = startedAt;
    if (scope.full) lastFullAt = startedAt;
    Promise.resolve()
      .then(() => options.run(scope))
      .catch(() => {
        // Lỗi tải đã được AppContext hiển thị; sự kiện sau sẽ thử lại.
      })
      .finally(() => {
        running = false;
        lastRunAt = Math.max(lastRunAt, now());
        schedule();
      });
  };

  return {
    push(change) {
      if (disposed) return;
      if (pending.length === 0) firstPendingAt = now();
      pending.push(change);
      schedule();
    },
    visibilityChanged() {
      if (options.isVisible()) schedule();
      else cancelTimer();
    },
    pendingCount: () => pending.length,
    dispose() {
      disposed = true;
      pending = [];
      cancelTimer();
    },
  };
}
