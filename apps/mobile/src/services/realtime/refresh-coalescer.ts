/**
 * Gom các sự kiện realtime liền nhau thành một lần tải lại màn hình.
 *
 * - Chờ `debounceMs` sau sự kiện cuối, nhưng không quá `maxDebounceMs` kể từ sự kiện đầu.
 * - Hai lần tải cách nhau ít nhất `minIntervalMs` (tính từ lúc bắt đầu lần trước).
 * - Không chạy chồng: sự kiện đến khi đang tải được dồn sang lượt sau.
 */
export interface RefreshCoalescerOptions {
  run: () => unknown;
  debounceMs?: number;
  maxDebounceMs?: number;
  minIntervalMs?: number;
  now?: () => number;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
}

export interface RefreshCoalescer {
  push(): void;
  /** Bỏ các sự kiện đang chờ (màn hình vừa tự tải lại). */
  cancel(): void;
  dispose(): void;
  pending(): boolean;
}

export const REALTIME_DEBOUNCE_MS = 800;
export const REALTIME_MAX_DEBOUNCE_MS = 2_500;
export const REALTIME_MIN_INTERVAL_MS = 3_000;

export function createRefreshCoalescer(options: RefreshCoalescerOptions): RefreshCoalescer {
  const debounceMs = options.debounceMs ?? REALTIME_DEBOUNCE_MS;
  const maxDebounceMs = options.maxDebounceMs ?? REALTIME_MAX_DEBOUNCE_MS;
  const minIntervalMs = options.minIntervalMs ?? REALTIME_MIN_INTERVAL_MS;
  const now = options.now ?? Date.now;
  const setTimer = options.setTimer ?? ((callback: () => void, ms: number) => setTimeout(callback, ms));
  const clearTimer = options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));

  let disposed = false;
  let waiting = false;
  let running = false;
  let firstAt = 0;
  let lastAt = 0;
  let lastRunAt = Number.NEGATIVE_INFINITY;
  let timer: unknown = null;

  const clear = () => {
    if (timer !== null) clearTimer(timer);
    timer = null;
  };

  const fire = async () => {
    timer = null;
    if (disposed || !waiting || running) return;
    waiting = false;
    running = true;
    lastRunAt = now();
    try {
      await options.run();
    } catch {
      // Màn hình tự hiển thị lỗi tải; lượt sau vẫn chạy bình thường.
    } finally {
      running = false;
      schedule();
    }
  };

  function schedule() {
    if (disposed || !waiting || running) return;
    const due = Math.max(Math.min(lastAt + debounceMs, firstAt + maxDebounceMs), lastRunAt + minIntervalMs);
    clear();
    timer = setTimer(() => {
      void fire();
    }, Math.max(0, due - now()));
  }

  return {
    push() {
      if (disposed) return;
      const at = now();
      if (!waiting) {
        waiting = true;
        firstAt = at;
      }
      lastAt = at;
      schedule();
    },
    cancel() {
      waiting = false;
      clear();
    },
    dispose() {
      disposed = true;
      waiting = false;
      clear();
    },
    pending: () => waiting,
  };
}
