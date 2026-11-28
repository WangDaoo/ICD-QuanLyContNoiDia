import { createSseParser, type SseEvent } from './sse-parser';
import { parseRealtimeChange, type RealtimeChangeMessage } from './realtime-change';

/**
 * Kết nối tới `GET /api/realtime/events` (Server-Sent Events) bằng `fetch` có
 * luồng body (`expo/fetch`), tự kết nối lại khi mạng chập chờn và tự làm mới
 * phiên khi access token hết hạn. Cùng giao thức với bản Web.
 */

export type RealtimeStatus = 'connecting' | 'live' | 'offline';

export interface RealtimeRequestInit {
  method: 'GET';
  headers: Record<string, string>;
  signal: AbortSignal;
}

/** Phần của `Response` mà luồng cần; `expo/fetch` và `fetch` chuẩn đều đáp ứng. */
export interface RealtimeResponse {
  status: number;
  ok: boolean;
  body: ReadableStream<Uint8Array> | null;
}

export type RealtimeFetch = (input: string, init: RealtimeRequestInit) => Promise<RealtimeResponse>;

export interface RealtimeStreamOptions {
  url: string;
  clientId: string;
  /** Token lưu trong SecureStore nên đọc bất đồng bộ. */
  getAccessToken: () => string | null | Promise<string | null>;
  /**
   * Làm mới phiên khi server từ chối token.
   * `true`: đã có token dùng được; `false`: phiên đã mất (dừng hẳn);
   * ném lỗi: lỗi tạm thời, thử lại sau.
   */
  renewSession: () => Promise<boolean>;
  onChange: (change: RealtimeChangeMessage) => void;
  /** Kết nối lại sau sự cố: có thể đã lỡ sự kiện nên cần tải lại. */
  onResync: () => void;
  onStatus: (status: RealtimeStatus) => void;
  fetchImpl: RealtimeFetch;
  setTimer?: (callback: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  random?: () => number;
  /** Ngắt và kết nối lại nếu không nhận byte nào trong khoảng này (kể cả heartbeat). */
  idleTimeoutMs?: number;
}

export interface RealtimeStream {
  start(): void;
  stop(): void;
}

export const REALTIME_BASE_BACKOFF_MS = 1_000;
export const REALTIME_MAX_BACKOFF_MS = 30_000;
export const REALTIME_IDLE_TIMEOUT_MS = 60_000;
/** Số lần làm mới phiên liên tiếp được kết nối lại ngay, sau đó phải chờ theo backoff. */
const MAX_IMMEDIATE_RENEWALS = 2;
const RENEW_REASONS = new Set(['token-expired', 'session-ended']);

/** Expo cài sẵn `TextDecoder`; bản dự phòng đủ cho dữ liệu sự kiện (chỉ gồm ký tự ASCII). */
function createDecoder(): (chunk: Uint8Array) => string {
  if (typeof TextDecoder !== 'undefined') {
    const decoder = new TextDecoder();
    return (chunk) => decoder.decode(chunk, { stream: true });
  }
  return (chunk) => {
    let text = '';
    for (let i = 0; i < chunk.length; i++) text += String.fromCharCode(chunk[i]);
    return text;
  };
}

export function createRealtimeStream(options: RealtimeStreamOptions): RealtimeStream {
  const fetchImpl = options.fetchImpl;
  const setTimer = options.setTimer ?? ((callback: () => void, ms: number) => setTimeout(callback, ms));
  const clearTimer = options.clearTimer ?? ((handle: unknown) => clearTimeout(handle as ReturnType<typeof setTimeout>));
  const random = options.random ?? Math.random;
  const defaultIdleMs = options.idleTimeoutMs ?? REALTIME_IDLE_TIMEOUT_MS;

  let stopped = true;
  let generation = 0;
  let controller: AbortController | null = null;
  let reconnectTimer: unknown = null;
  let idleTimer: unknown = null;
  let idleMs = defaultIdleMs;
  let attempt = 0;
  let renewals = 0;
  let serverRetryMs = 0;
  let needsResync = false;
  let status: RealtimeStatus | null = null;

  const setStatus = (next: RealtimeStatus) => {
    if (status === next) return;
    status = next;
    options.onStatus(next);
  };

  const clearIdle = () => {
    if (idleTimer !== null) clearTimer(idleTimer);
    idleTimer = null;
  };

  const backoffMs = () => {
    const exponential = Math.min(REALTIME_MAX_BACKOFF_MS, REALTIME_BASE_BACKOFF_MS * 2 ** attempt);
    attempt = Math.min(attempt + 1, 10);
    return Math.max(serverRetryMs, exponential) + Math.floor(random() * 500);
  };

  const scheduleReconnect = (delayMs: number) => {
    if (stopped) return;
    setStatus('connecting');
    if (reconnectTimer !== null) clearTimer(reconnectTimer);
    reconnectTimer = setTimer(() => {
      reconnectTimer = null;
      void connect();
    }, delayMs);
  };

  const goOffline = () => {
    stopped = true;
    generation++;
    clearIdle();
    controller?.abort();
    controller = null;
    setStatus('offline');
  };

  const renewAndReconnect = async (gen: number) => {
    renewals++;
    let renewed: boolean;
    try {
      renewed = await options.renewSession();
    } catch {
      if (gen === generation && !stopped) scheduleReconnect(backoffMs());
      return;
    }
    if (gen !== generation || stopped) return;
    if (!renewed) {
      goOffline();
      return;
    }
    scheduleReconnect(renewals <= MAX_IMMEDIATE_RENEWALS ? 0 : backoffMs());
  };

  const connect = async () => {
    if (stopped) return;
    const gen = ++generation;
    const current = () => gen === generation && !stopped;

    let token: string | null;
    try {
      token = await options.getAccessToken();
    } catch {
      if (current()) scheduleReconnect(backoffMs());
      return;
    }
    if (!current()) return;
    if (!token) {
      goOffline();
      return;
    }

    const abort = new AbortController();
    controller = abort;
    let closeReason: string | null = null;

    const armIdle = () => {
      clearIdle();
      idleTimer = setTimer(() => {
        idleTimer = null;
        // Kết nối "treo" (mất mạng mà không nhận được lỗi): chủ động cắt để kết nối lại.
        if (current()) abort.abort();
      }, idleMs);
    };

    const handleEvent = (event: SseEvent) => {
      if (!current()) return;
      if (event.event === 'ready') {
        let heartbeatMs = 0;
        try {
          const payload = JSON.parse(event.data) as { heartbeatMs?: unknown };
          if (typeof payload.heartbeatMs === 'number' && payload.heartbeatMs > 0) heartbeatMs = payload.heartbeatMs;
        } catch {
          // Giữ thời gian chờ mặc định.
        }
        idleMs = heartbeatMs ? Math.max(heartbeatMs * 2 + 5_000, 10_000) : defaultIdleMs;
        armIdle();
        attempt = 0;
        renewals = 0;
        setStatus('live');
        if (needsResync) {
          needsResync = false;
          options.onResync();
        }
        return;
      }
      if (event.event === 'change') {
        const change = parseRealtimeChange(event.data);
        if (change) options.onChange(change);
        return;
      }
      if (event.event === 'close') {
        try {
          const payload = JSON.parse(event.data) as { reason?: unknown };
          closeReason = typeof payload.reason === 'string' ? payload.reason : 'unknown';
        } catch {
          closeReason = 'unknown';
        }
      }
    };

    const parser = createSseParser(handleEvent, (ms) => {
      serverRetryMs = Math.min(ms, REALTIME_MAX_BACKOFF_MS);
    });

    idleMs = defaultIdleMs;
    armIdle();

    let response: RealtimeResponse;
    try {
      response = await fetchImpl(options.url, {
        method: 'GET',
        headers: {
          Accept: 'text/event-stream',
          Authorization: `Bearer ${token}`,
          'X-Client-Id': options.clientId,
        },
        signal: abort.signal,
      });
    } catch {
      if (!current()) return;
      clearIdle();
      needsResync = true;
      scheduleReconnect(backoffMs());
      return;
    }
    if (!current()) {
      abort.abort();
      return;
    }

    if (response.status === 401) {
      clearIdle();
      needsResync = true;
      void response.body?.cancel().catch(() => undefined);
      await renewAndReconnect(gen);
      return;
    }
    if (!response.ok || !response.body) {
      // 403/429/5xx: chờ rồi thử lại, không làm mới phiên.
      clearIdle();
      needsResync = true;
      void response.body?.cancel().catch(() => undefined);
      scheduleReconnect(backoffMs());
      return;
    }

    const reader = response.body.getReader();
    const decode = createDecoder();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!current()) return;
        armIdle();
        if (value) parser.feed(decode(value));
      }
    } catch {
      // Mất mạng, bị hủy do idle hoặc do stop(): xử lý chung bên dưới.
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Đã bị hủy cùng kết nối.
      }
    }
    if (!current()) return;
    clearIdle();
    parser.reset();
    needsResync = true;
    if (closeReason && RENEW_REASONS.has(closeReason)) {
      await renewAndReconnect(gen);
      return;
    }
    scheduleReconnect(backoffMs());
  };

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      attempt = 0;
      renewals = 0;
      needsResync = false;
      status = null;
      setStatus('connecting');
      void connect();
    },
    stop() {
      stopped = true;
      generation++;
      if (reconnectTimer !== null) clearTimer(reconnectTimer);
      reconnectTimer = null;
      clearIdle();
      controller?.abort();
      controller = null;
    },
  };
}
