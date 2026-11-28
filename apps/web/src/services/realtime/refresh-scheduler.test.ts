import assert from 'node:assert/strict';
import test from 'node:test';
import { RESYNC_CHANGE, type RealtimeChangeMessage, type RefreshScope } from './refresh-plan';
import { createRefreshScheduler } from './refresh-scheduler';

/** Đồng hồ giả: chạy hẹn giờ theo thứ tự thời điểm. */
function fakeClock() {
  let time = 0;
  let nextId = 1;
  const timers = new Map<number, { at: number; callback: () => void }>();
  return {
    now: () => time,
    setTimer: (callback: () => void, ms: number) => {
      const id = nextId++;
      timers.set(id, { at: time + ms, callback });
      return id;
    },
    clearTimer: (handle: unknown) => {
      timers.delete(handle as number);
    },
    async advance(ms: number) {
      const target = time + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        time = due[1].at;
        due[1].callback();
        // Cho promise của `run` chạy xong.
        await new Promise((resolve) => setImmediate(resolve));
      }
      time = target;
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}

const change = (topics: string[], visitId: string | null = null): RealtimeChangeMessage => ({
  id: 1, at: '', topics, source: 'http', origin: null, visitId,
});

function setup(visible = { value: true }) {
  const clock = fakeClock();
  const runs: { at: number; scope: RefreshScope }[] = [];
  const scheduler = createRefreshScheduler({
    run: async (scope) => {
      runs.push({ at: clock.now(), scope });
    },
    isVisible: () => visible.value,
    debounceMs: 800,
    maxDebounceMs: 2_000,
    minIntervalMs: 3_000,
    fullMinIntervalMs: 15_000,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  return { clock, runs, scheduler, visible };
}

test('gom các sự kiện liền nhau thành một lần tải', async () => {
  const { clock, runs, scheduler } = setup();
  scheduler.push(change(['holds'], 'v1'));
  await clock.advance(500);
  scheduler.push(change(['billing']));
  await clock.advance(799);
  assert.equal(runs.length, 0);
  await clock.advance(1);
  assert.equal(runs.length, 1);
  assert.ok(runs[0].scope.keys.has('invoices'));
  assert.deepEqual([...(runs[0].scope.safety as Set<string>)], ['v1']);
  assert.equal(scheduler.pendingCount(), 0);
});

test('sự kiện dồn dập vẫn được tải sau thời gian gom tối đa', async () => {
  const { clock, runs, scheduler } = setup();
  for (let i = 0; i < 10; i++) {
    scheduler.push(change(['containers']));
    await clock.advance(300);
  }
  assert.equal(runs.length, 1);
  assert.equal(runs[0].at, 2_000);
});

test('giữ khoảng cách tối thiểu giữa hai lần tải và giữa hai lần tải toàn bộ', async () => {
  const { clock, runs, scheduler } = setup();
  scheduler.push(RESYNC_CHANGE);
  await clock.advance(800);
  assert.equal(runs.length, 1);
  scheduler.push(change(['containers']));
  await clock.advance(2_000);
  assert.equal(runs.length, 1);
  await clock.advance(1_000);
  assert.equal(runs.length, 2);
  assert.equal(runs[1].at, 3_800);
  scheduler.push(RESYNC_CHANGE);
  await clock.advance(10_000);
  assert.equal(runs.length, 2);
  await clock.advance(2_000);
  assert.equal(runs.length, 3);
  assert.equal(runs[2].at, 15_800);
  assert.equal(runs[2].scope.full, true);
});

test('tab ẩn chỉ ghi nhận, hiện lại mới tải', async () => {
  const visible = { value: false };
  const { clock, runs, scheduler } = setup(visible);
  scheduler.push(change(['edi']));
  await clock.advance(60_000);
  assert.equal(runs.length, 0);
  assert.equal(scheduler.pendingCount(), 1);
  visible.value = true;
  scheduler.visibilityChanged();
  await clock.advance(800);
  assert.equal(runs.length, 1);
});

test('không chạy chồng: sự kiện đến khi đang tải được tải ở lượt sau', async () => {
  const clock = fakeClock();
  let release: () => void = () => undefined;
  const scopes: RefreshScope[] = [];
  const scheduler = createRefreshScheduler({
    run: (scope) => {
      scopes.push(scope);
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    isVisible: () => true,
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
  });
  scheduler.push(change(['containers']));
  await clock.advance(800);
  scheduler.push(change(['billing']));
  await clock.advance(10_000);
  assert.equal(scopes.length, 1);
  release();
  await clock.advance(0);
  await clock.advance(3_000);
  assert.equal(scopes.length, 2);
  assert.ok(scopes[1].keys.has('invoices'));
  scheduler.dispose();
});

test('dispose hủy hẹn giờ và bỏ sự kiện sau đó', async () => {
  const { clock, runs, scheduler } = setup();
  scheduler.push(change(['containers']));
  scheduler.dispose();
  scheduler.push(change(['containers']));
  await clock.advance(10_000);
  assert.equal(runs.length, 0);
});
