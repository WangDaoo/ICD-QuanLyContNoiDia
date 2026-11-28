import assert from 'node:assert/strict';
import test from 'node:test';
import { createSseParser, type SseEvent } from './sse-parser';

const collect = () => {
  const events: SseEvent[] = [];
  const retries: number[] = [];
  const parser = createSseParser((event) => events.push(event), (ms) => retries.push(ms));
  return { events, retries, parser };
};

test('tách sự kiện có tên, id và data nhiều dòng', () => {
  const { events, parser } = collect();
  parser.feed('event: change\nid: 7\ndata: {"a":1,\ndata: "b":2}\n\n');
  assert.deepEqual(events, [{ event: 'change', id: '7', data: '{"a":1,\n"b":2}' }]);
});

test('ghép sự kiện bị cắt giữa chừng, kể cả giữa CR LF', () => {
  const { events, parser } = collect();
  for (const chunk of ['eve', 'nt: ready\r', '\ndata: {"heartbeatMs":25000}\r', '\n\r', '\n']) parser.feed(chunk);
  assert.deepEqual(events, [{ event: 'ready', data: '{"heartbeatMs":25000}' }]);
});

test('bỏ qua heartbeat, khối không có data và trường lạ; báo retry ngay', () => {
  const { events, retries, parser } = collect();
  parser.feed('retry: 3000\n\n: ping\n\nfoo: bar\nevent: close\n\ndata: x\n\n');
  assert.deepEqual(retries, [3000]);
  // `event: close` không có data nên không phát; tên sự kiện không lan sang khối sau.
  assert.deepEqual(events, [{ event: 'message', data: 'x' }]);
});

test('reset bỏ phần dở dang', () => {
  const { events, parser } = collect();
  parser.feed('event: change\ndata: half');
  parser.reset();
  parser.feed('\n\ndata: next\n\n');
  assert.deepEqual(events, [{ event: 'message', data: 'next' }]);
});
