/* global require, setImmediate, ReadableStream, TextEncoder */
/* eslint-disable @typescript-eslint/no-require-imports -- Node regression harness uses CommonJS. */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./improvement-harness.cjs');

const { createSseParser } = load('src/services/realtime/sse-parser.ts');
const { parseRealtimeChange, changeMatchesTopics, RESYNC_CHANGE } = load('src/services/realtime/realtime-change.ts');
const { createRefreshCoalescer } = load('src/services/realtime/refresh-coalescer.ts');
const { createRealtimeStream } = load('src/services/realtime/realtime-stream.ts');

const settle = async () => {
  for (let i = 0; i < 6; i++) await new Promise((resolve) => setImmediate(resolve));
};

/* ---------------------------------------------------------------- SSE parser */

test('bộ đọc SSE ghép sự kiện bị cắt giữa chừng, bỏ heartbeat và nhận retry', () => {
  const events = [];
  const retries = [];
  const parser = createSseParser((event) => events.push(event), (ms) => retries.push(ms));
  parser.feed('retry: 3000\n\n: ping\n\nevent: chan');
  parser.feed('ge\nid: 7\ndata: {"a":\ndata: 1}\r\n\r\n');
  assert.deepEqual(retries, [3000]);
  assert.equal(events.length, 1);
  assert.equal(events[0].event, 'change');
  assert.equal(events[0].id, '7');
  assert.equal(events[0].data, '{"a":\n1}');
});

test('bộ đọc SSE bỏ phần dở dang khi reset (kết nối mới)', () => {
  const events = [];
  const parser = createSseParser((event) => events.push(event));
  parser.feed('event: change\ndata: {"topics":["yard"]');
  parser.reset();
  parser.feed('event: ready\ndata: {}\n\n');
  assert.deepEqual(events.map((event) => event.event), ['ready']);
});

/* ------------------------------------------------------------ change message */

test('sự kiện thay đổi hợp lệ được đọc, mã lạ hoặc dữ liệu hỏng bị bỏ', () => {
  const change = parseRealtimeChange(
    JSON.stringify({ id: 4, at: 'now', topics: ['holds', '', 3], source: 'http', origin: 'web-tab-1', visitId: 'visit<script>' }),
  );
  assert.deepEqual(change.topics, ['holds']);
  assert.equal(change.origin, 'web-tab-1');
  assert.equal(change.visitId, null, 'mã không đúng mẫu không được dùng để lọc');
  assert.equal(parseRealtimeChange('not json'), null);
  assert.equal(parseRealtimeChange(JSON.stringify({ topics: [] })), null);
  assert.equal(parseRealtimeChange(JSON.stringify([1])), null);
});

test('màn hình chỉ tải lại khi nhóm dữ liệu liên quan, nhóm other và resync luôn khớp', () => {
  const change = (topics) => ({ id: 1, at: '', topics, source: 'http', origin: null, visitId: null });
  assert.equal(changeMatchesTopics(change(['billing']), ['yard', 'gate']), false);
  assert.equal(changeMatchesTopics(change(['billing', 'gate']), ['yard', 'gate']), true);
  assert.equal(changeMatchesTopics(change(['other']), ['notifications']), true);
  assert.equal(changeMatchesTopics(RESYNC_CHANGE, ['notifications']), true);
  assert.equal(changeMatchesTopics(change(['admin'])), true, 'không khai báo nhóm thì nhận mọi thay đổi');
});

/* --------------------------------------------------------- refresh coalescer */

function fakeClock() {
  let time = 0;
  let nextId = 1;
  const timers = new Map();
  return {
    now: () => time,
    setTimer: (callback, ms) => {
      const id = nextId++;
      timers.set(id, { at: time + ms, callback });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
    async advance(ms) {
      const end = time + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        time = due[1].at;
        due[1].callback();
        await settle();
      }
      time = end;
    },
    pending: () => timers.size,
  };
}

test('nhiều sự kiện liền nhau chỉ gây một lần tải lại', async () => {
  const clock = fakeClock();
  let runs = 0;
  const coalescer = createRefreshCoalescer({ run: () => runs++, ...clock });
  coalescer.push();
  await clock.advance(500);
  coalescer.push();
  await clock.advance(500);
  coalescer.push();
  assert.equal(runs, 0);
  await clock.advance(800);
  assert.equal(runs, 1);
  assert.equal(coalescer.pending(), false);
});

test('sự kiện dồn dập vẫn được tải lại sau thời gian chờ tối đa', async () => {
  const clock = fakeClock();
  let runs = 0;
  const coalescer = createRefreshCoalescer({ run: () => runs++, ...clock });
  for (let i = 0; i < 6; i++) {
    coalescer.push();
    await clock.advance(500);
  }
  assert.equal(runs, 1, 'chạy ở mốc 2,5 giây dù sự kiện chưa ngớt');
});

test('không tải chồng: sự kiện đến khi đang tải được dồn sang lượt sau, cách lượt trước tối thiểu', async () => {
  const clock = fakeClock();
  const starts = [];
  let finish;
  const coalescer = createRefreshCoalescer({
    run: () => {
      starts.push(clock.now());
      return new Promise((resolve) => {
        finish = resolve;
      });
    },
    ...clock,
  });
  coalescer.push();
  await clock.advance(800);
  assert.deepEqual(starts, [800]);
  coalescer.push();
  await clock.advance(5_000);
  assert.deepEqual(starts, [800], 'lượt đầu chưa xong thì chưa chạy lượt mới');
  finish();
  await settle();
  await clock.advance(1);
  assert.equal(starts.length, 2);
  finish();
  await settle();
  coalescer.push();
  await clock.advance(800);
  assert.equal(starts.length, 2, 'lượt kế tiếp phải cách lượt trước 3 giây');
  await clock.advance(3_000);
  assert.equal(starts.length, 3);
  assert.ok(starts[2] - starts[1] >= 3_000);
});

test('lỗi khi tải không chặn lượt sau; dispose hủy lượt đang chờ', async () => {
  const clock = fakeClock();
  let runs = 0;
  const coalescer = createRefreshCoalescer({
    run: async () => {
      runs++;
      throw new Error('mạng lỗi');
    },
    ...clock,
  });
  coalescer.push();
  await clock.advance(800);
  coalescer.push();
  await clock.advance(3_000);
  assert.equal(runs, 2);
  coalescer.push();
  coalescer.dispose();
  await clock.advance(10_000);
  assert.equal(runs, 2);
  assert.equal(clock.pending(), 0);
});

/* ------------------------------------------------------------ realtime stream */

/** Phản hồi SSE do test điều khiển; hủy theo `signal` như `expo/fetch`. */
function sseResponse(signal, status = 200) {
  let controller;
  const body = new ReadableStream({
    start(c) {
      controller = c;
    },
  });
  const encoder = new TextEncoder();
  signal.addEventListener('abort', () => {
    try {
      controller.error(new Error('aborted'));
    } catch {
      // Luồng đã đóng.
    }
  });
  return {
    response: { status, ok: status >= 200 && status < 300, body: status === 200 ? body : null },
    push: (text) => controller.enqueue(encoder.encode(text)),
    end: () => controller.close(),
  };
}

function streamHarness(overrides = {}) {
  const calls = [];
  const streams = [];
  const scripts = [];
  const statuses = [];
  const changes = [];
  const timers = new Map();
  let resyncs = 0;
  let renewCalls = 0;
  let renewResult = true;
  let nextTimer = 1;
  let token = 'token-1';

  const stream = createRealtimeStream({
    url: 'http://api.test/api/realtime/events',
    clientId: 'mobile-1',
    // Token đọc từ SecureStore là bất đồng bộ.
    getAccessToken: async () => token,
    renewSession: async () => {
      renewCalls++;
      if (renewResult) token = 'token-2';
      return renewResult;
    },
    onChange: (change) => changes.push(change),
    onResync: () => {
      resyncs++;
    },
    onStatus: (status) => statuses.push(status),
    fetchImpl: async (url, init) => {
      calls.push({ url, init });
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
    clearTimer: (id) => timers.delete(id),
    random: () => 0,
    ...overrides,
  });

  const run = async (match) => {
    const due = [...timers.entries()].filter(([, t]) => match(t.ms));
    for (const [id, t] of due) {
      timers.delete(id);
      t.callback();
    }
    await settle();
    return due.map(([, t]) => t.ms);
  };

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
    failRenewal: () => {
      renewResult = false;
    },
    setToken: (value) => {
      token = value;
    },
    /** Hẹn giờ kết nối lại (tối đa 30 giây + độ lệch); hẹn giờ phát hiện treo dài hơn. */
    runReconnect: () => run((ms) => ms <= 31_000),
    runIdle: () => run((ms) => ms > 31_000),
  };
}

const READY = 'event: ready\ndata: {"heartbeatMs":25000}\n\n';
const changeEvent = (id, topics, origin = 'web-admin') =>
  `event: change\nid: ${id}\ndata: ${JSON.stringify({ id, at: 'now', topics, source: 'http', origin, visitId: null })}\n\n`;

test('gửi token, mã thiết bị; báo trực tiếp khi sẵn sàng và chuyển tiếp sự kiện', async () => {
  const h = streamHarness();
  h.stream.start();
  await settle();
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].url, 'http://api.test/api/realtime/events');
  assert.equal(h.calls[0].init.method, 'GET');
  assert.equal(h.calls[0].init.headers.Accept, 'text/event-stream');
  assert.equal(h.calls[0].init.headers.Authorization, 'Bearer token-1');
  assert.equal(h.calls[0].init.headers['X-Client-Id'], 'mobile-1');
  h.streams[0].push(READY);
  h.streams[0].push(': ping\n\n' + changeEvent(3, ['yard', 'holds']) + 'event: change\ndata: hỏng\n\n');
  await settle();
  assert.deepEqual(h.statuses, ['connecting', 'live']);
  assert.equal(h.changes.length, 1, 'sự kiện hỏng bị bỏ');
  assert.deepEqual(h.changes[0].topics, ['yard', 'holds']);
  assert.equal(h.changes[0].origin, 'web-admin');
  assert.equal(h.resyncs(), 0, 'lần kết nối đầu không cần tải lại toàn bộ');
  h.stream.stop();
});

test('mất kết nối thì chờ rồi kết nối lại và báo các màn hình tải lại', async () => {
  const h = streamHarness();
  h.stream.start();
  await settle();
  h.streams[0].push(READY);
  await settle();
  h.streams[0].end();
  await settle();
  assert.equal(h.statuses.at(-1), 'connecting');
  assert.deepEqual(await h.runReconnect(), [1_000]);
  assert.equal(h.calls.length, 2);
  h.streams[1].push(READY);
  await settle();
  assert.equal(h.statuses.at(-1), 'live');
  assert.equal(h.resyncs(), 1);
  h.stream.stop();
});

test('server lỗi liên tiếp thì giãn thời gian chờ', async () => {
  const h = streamHarness();
  h.scripts.push(
    () => ({ status: 503, ok: false, body: null }),
    () => ({ status: 503, ok: false, body: null }),
    () => Promise.reject(new TypeError('Network request failed')),
  );
  h.stream.start();
  await settle();
  assert.deepEqual(await h.runReconnect(), [1_000]);
  assert.deepEqual(await h.runReconnect(), [2_000]);
  assert.deepEqual(await h.runReconnect(), [4_000]);
  assert.equal(h.renewCalls(), 0, 'lỗi server không làm mới phiên');
  h.stream.stop();
});

test('token bị từ chối thì làm mới phiên rồi kết nối lại ngay bằng token mới', async () => {
  const h = streamHarness();
  h.scripts.push(() => ({ status: 401, ok: false, body: null }));
  h.stream.start();
  await settle();
  assert.equal(h.renewCalls(), 1);
  assert.deepEqual(await h.runReconnect(), [0]);
  assert.equal(h.calls.at(-1).init.headers.Authorization, 'Bearer token-2');
  h.stream.stop();
});

test('server báo token hết hạn khi đang nghe thì làm mới phiên trước khi kết nối lại', async () => {
  const h = streamHarness();
  h.stream.start();
  await settle();
  h.streams[0].push(READY + 'event: close\ndata: {"reason":"token-expired"}\n\n');
  h.streams[0].end();
  await settle();
  assert.equal(h.renewCalls(), 1);
  assert.deepEqual(await h.runReconnect(), [0]);
  assert.equal(h.calls[1].init.headers.Authorization, 'Bearer token-2');
  h.stream.stop();
});

test('phiên đã mất hoặc chưa có token thì dừng hẳn ở trạng thái offline', async () => {
  const h = streamHarness();
  h.failRenewal();
  h.scripts.push(() => ({ status: 401, ok: false, body: null }));
  h.stream.start();
  await settle();
  assert.equal(h.statuses.at(-1), 'offline');
  assert.equal(h.timers.size, 0, 'không hẹn kết nối lại');

  const noToken = streamHarness();
  noToken.setToken(null);
  noToken.stream.start();
  await settle();
  assert.equal(noToken.calls.length, 0);
  assert.equal(noToken.statuses.at(-1), 'offline');
});

test('kết nối treo không nhận byte nào thì bị cắt và kết nối lại', async () => {
  const h = streamHarness();
  h.stream.start();
  await settle();
  h.streams[0].push(READY);
  await settle();
  const idle = [...h.timers.values()].map((timer) => timer.ms);
  assert.deepEqual(idle, [55_000], 'chờ hai nhịp heartbeat cộng 5 giây');
  await h.runIdle();
  assert.equal(h.statuses.at(-1), 'connecting');
  assert.deepEqual(await h.runReconnect(), [1_000]);
  assert.equal(h.calls.length, 2);
  h.stream.stop();
});

test('stop hủy kết nối và không kết nối lại', async () => {
  const h = streamHarness();
  h.stream.start();
  await settle();
  h.streams[0].push(READY);
  await settle();
  h.stream.stop();
  await settle();
  assert.equal(h.timers.size, 0);
  await h.runReconnect();
  assert.equal(h.calls.length, 1);
});

/* ---------------------------------------------------------- useRealtimeRefresh */

function hookFixture() {
  let focusEffect;
  const listeners = new Set();
  const pushes = [];
  const disposed = [];
  const react = {
    useRef: (initial) => ({ current: initial }),
    useEffect: () => {},
    useCallback: (fn) => fn,
    useContext: () => ({
      status: 'live',
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
    }),
    createContext: () => ({}),
  };
  const { useRealtimeRefresh } = load('src/services/realtime/useRealtimeRefresh.ts', {
    react,
    '@react-navigation/native': {
      useFocusEffect: (fn) => {
        focusEffect = fn;
      },
    },
    './refresh-coalescer': {
      createRefreshCoalescer: () => ({
        push: () => pushes.push(1),
        dispose: () => disposed.push(1),
      }),
    },
  });
  return {
    useRealtimeRefresh,
    focus: () => focusEffect(),
    emit: (change) => [...listeners].forEach((listener) => listener(change)),
    listeners,
    pushes,
    disposed,
  };
}

const change = (topics, visitId = null) => ({ id: 1, at: '', topics, source: 'http', origin: 'web-admin', visitId });

test('màn hình đang mở chỉ tải lại theo nhóm dữ liệu và bộ lọc của nó', () => {
  const f = hookFixture();
  f.useRealtimeRefresh(() => undefined, { topics: ['holds'], accept: (c) => !c.visitId || c.visitId === 'visit-1' });
  assert.equal(f.listeners.size, 0, 'chưa focus thì chưa nghe');
  const blur = f.focus();
  assert.equal(f.listeners.size, 1);
  f.emit(change(['billing']));
  f.emit(change(['holds'], 'visit-2'));
  assert.equal(f.pushes.length, 0);
  f.emit(change(['holds'], 'visit-1'));
  f.emit(RESYNC_CHANGE);
  assert.equal(f.pushes.length, 2);
  blur();
  assert.equal(f.listeners.size, 0, 'rời màn hình thì ngừng nghe');
  assert.equal(f.disposed.length, 1);
});
