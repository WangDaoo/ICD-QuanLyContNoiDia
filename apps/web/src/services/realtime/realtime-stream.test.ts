import assert from 'node:assert/strict';
import test from 'node:test';
import type { RealtimeChangeMessage } from './refresh-plan';
import { createRealtimeStream, type RealtimeStatus, type RealtimeStreamOptions } from './realtime-stream';

const settle = async () => {
  for (let i = 0; i < 5; i++) await new Promise((resolve) => setImmediate(resolve));
};

/** Phản hồi SSE do test điều khiển; hủy theo `signal` như fetch thật. */
function sseResponse(signal?: AbortSignal | null, status = 200) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const encoder = new TextEncoder();
  signal?.addEventListener('abort', () => {
    try {
      controller.error(new DOMException('aborted', 'AbortError'));
    } catch {
      // Luồng đã đóng.
    }
  });
  return {
    response: new Response(status === 200 ? body : null, { status }),
    push: (text: string) => controller.enqueue(encoder.encode(text)),
    end: () => controller.close(),
  };
}

type Script = (init: RequestInit) => Response | Promise<Response> | 'stream';

function harness(overrides: Partial<RealtimeStreamOptions> = {}) {
  const calls: RequestInit[] = [];
  const streams: ReturnType<typeof sseResponse>[] = [];
  const scripts: Script[] = [];
  const statuses: RealtimeStatus[] = [];
  const changes: RealtimeChangeMessage[] = [];
  let resyncs = 0;
  let renewCalls = 0;
  let nextTimer = 1;
  const timers = new Map<number, { ms: number; callback: () => void }>();
  let token: string | null = 'token-1';

  const stream = createRealtimeStream({
    url: 'http://api.test/api/realtime/events',
    clientId: 'web-tab-1',
    getAccessToken: () => token,
    renewSession: async () => {
      renewCalls++;
      token = 'token-2';
      return true;
    },
    onChange: (change) => changes.push(change),
    onResync: () => {
      resyncs++;
    },
    onStatus: (status) => statuses.push(status),
    fetchImpl: async (_url, init) => {
      calls.push(init);
      const script = scripts.shift();
      const result = script ? script(init) : 'stream';
      if (result !== 'stream') return result;
      const sse = sseResponse(init.signal);
      streams.push(sse);
      return sse.response;
    },
    setTimer: (callback, ms) => {
      const id = nextTimer++;
      timers.set(id, { ms, callback });
      return id;
    },
    clearTimer: (handle) => {
      timers.delete(handle as number);
    },
    random: () => 0,
    ...overrides,
  });

  return {
    stream,
    calls,
    streams,
    scripts,
    statuses,
    changes,
    timers,
    resyncs: () => resyncs,
    renewCalls: () => renewCalls,
    setToken: (value: string | null) => {
      token = value;
    },
    /** Chạy các hẹn giờ kết nối lại (bỏ qua hẹn giờ phát hiện kết nối treo). */
    async runReconnect() {
      const due = [...timers.entries()].filter(([, t]) => t.ms <= 31_000);
      for (const [id, t] of due) {
        timers.delete(id);
        t.callback();
      }
      await settle();
      return due.map(([, t]) => t.ms);
    },
    async runIdle() {
      const due = [...timers.entries()].filter(([, t]) => t.ms > 31_000);
      for (const [id, t] of due) {
        timers.delete(id);
        t.callback();
      }
      await settle();
    },
  };
}

const READY = 'retry: 3000\n\nevent: ready\ndata: {"heartbeatMs":25000}\n\n';
const changeEvent = (id: number, topics: string[]) =>
  `event: change\nid: ${id}\ndata: ${JSON.stringify({ id, at: 'now', topics, source: 'http', origin: 'web-tab-2', visitId: null })}\n\n`;

test('gửi token và mã tab, báo trực tiếp khi sẵn sàng, chuyển tiếp sự kiện', async () => {
  const h = harness();
  h.stream.start();
  await settle();
  assert.equal(h.calls.length, 1);
  const headers = h.calls[0].headers as Record<string, string>;
  assert.equal(headers.Authorization, 'Bearer token-1');
  assert.equal(headers.Accept, 'text/event-stream');
  assert.equal(headers['X-Client-Id'], 'web-tab-1');
  h.streams[0].push(READY);
  h.streams[0].push(': ping\n\n' + changeEvent(5, ['holds']));
  await settle();
  assert.deepEqual(h.statuses, ['connecting', 'live']);
  assert.equal(h.changes.length, 1);
  assert.deepEqual(h.changes[0].topics, ['holds']);
  assert.equal(h.changes[0].origin, 'web-tab-2');
  assert.equal(h.resyncs(), 0, 'lần kết nối đầu không cần tải lại toàn bộ');
  h.stream.stop();
});

test('mất kết nối thì chờ rồi kết nối lại và yêu cầu tải lại toàn bộ', async () => {
  const h = harness();
  h.stream.start();
  await settle();
  h.streams[0].push(READY);
  await settle();
  h.streams[0].end();
  await settle();
  assert.equal(h.statuses.at(-1), 'connecting');
  const delays = await h.runReconnect();
  assert.deepEqual(delays, [3_000], 'theo retry do server đề nghị');
  assert.equal(h.calls.length, 2);
  h.streams[1].push(READY);
  await settle();
  assert.equal(h.statuses.at(-1), 'live');
  assert.equal(h.resyncs(), 1);
  h.stream.stop();
});

test('server lỗi liên tiếp thì giãn thời gian chờ', async () => {
  const h = harness();
  h.scripts.push(() => new Response(null, { status: 503 }), () => new Response(null, { status: 429 }));
  h.stream.start();
  await settle();
  assert.deepEqual(await h.runReconnect(), [1_000]);
  assert.deepEqual(await h.runReconnect(), [2_000]);
  assert.equal(h.calls.length, 3);
  h.streams[0].push(READY);
  await settle();
  assert.equal(h.resyncs(), 1);
  h.stream.stop();
});

test('token bị từ chối thì làm mới phiên rồi kết nối lại ngay bằng token mới', async () => {
  const h = harness();
  h.scripts.push(() => new Response(null, { status: 401 }));
  h.stream.start();
  await settle();
  assert.equal(h.renewCalls(), 1);
  assert.deepEqual(await h.runReconnect(), [0]);
  assert.equal((h.calls[1].headers as Record<string, string>).Authorization, 'Bearer token-2');
  h.stream.stop();
});

test('server báo token hết hạn thì làm mới phiên trước khi kết nối lại', async () => {
  const h = harness();
  h.stream.start();
  await settle();
  h.streams[0].push(READY + 'event: close\ndata: {"reason":"token-expired"}\n\n');
  h.streams[0].end();
  await settle();
  assert.equal(h.renewCalls(), 1);
  assert.deepEqual(await h.runReconnect(), [0]);
  assert.equal(h.calls.length, 2);
  h.stream.stop();
});

test('phiên đã mất thì dừng hẳn ở trạng thái tạm dừng', async () => {
  const h = harness({ renewSession: async () => false });
  h.scripts.push(() => new Response(null, { status: 401 }));
  h.stream.start();
  await settle();
  assert.equal(h.statuses.at(-1), 'offline');
  assert.deepEqual(await h.runReconnect(), []);
  assert.equal(h.calls.length, 1);
});

test('kết nối treo không nhận byte nào thì bị cắt và kết nối lại', async () => {
  const h = harness();
  h.stream.start();
  await settle();
  h.streams[0].push(READY);
  await settle();
  const idle = [...h.timers.values()].find((t) => t.ms > 31_000);
  assert.equal(idle?.ms, 55_000, 'gấp đôi heartbeat cộng 5 giây');
  await h.runIdle();
  assert.equal(h.statuses.at(-1), 'connecting');
  await h.runReconnect();
  assert.equal(h.calls.length, 2);
  h.stream.stop();
});

test('stop hủy kết nối và không kết nối lại', async () => {
  const h = harness();
  h.stream.start();
  await settle();
  h.stream.stop();
  await settle();
  assert.deepEqual(await h.runReconnect(), []);
  assert.equal(h.calls.length, 1);
  assert.equal(h.timers.size, 0);
});
