import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DATA_KEYS,
  mergeRefreshScopes,
  parseRealtimeChange,
  planRealtimeRefresh,
  RESYNC_CHANGE,
  type RealtimeChangeMessage,
} from './refresh-plan';

const change = (topics: string[], extra: Partial<RealtimeChangeMessage> = {}): RealtimeChangeMessage => ({
  id: 1,
  at: '2026-11-28T00:00:00.000Z',
  topics,
  source: 'http',
  origin: null,
  visitId: null,
  ...extra,
});

test('đọc sự kiện hợp lệ và loại mã định danh lạ', () => {
  const parsed = parseRealtimeChange(JSON.stringify({
    id: 3, at: 'x', topics: ['holds', 5, ''], source: 'http', origin: 'web-1', visitId: 'bad id<script>',
  }));
  assert.deepEqual(parsed, { id: 3, at: 'x', topics: ['holds'], source: 'http', origin: 'web-1', visitId: null });
  assert.equal(parseRealtimeChange('not json'), null);
  assert.equal(parseRealtimeChange('[]'), null);
  assert.equal(parseRealtimeChange(JSON.stringify({ topics: [] })), null);
});

test('lệnh giữ của một container chỉ đọc lại điều kiện an toàn của container đó', () => {
  const scope = planRealtimeRefresh([change(['holds', 'containers'], { visitId: 'visit-1' })]);
  assert.ok(scope);
  assert.equal(scope.full, false);
  assert.equal(scope.background, true);
  assert.deepEqual([...(scope.safety as Set<string>)], ['visit-1']);
  assert.ok(scope.keys.has('containerVisits'));
  assert.ok(scope.keys.has('workQueue'));
  assert.ok(scope.keys.has('auditLogs'));
  assert.ok(!scope.keys.has('invoices'));
  assert.equal(scope.partnerOptions, false);
});

test('Gate Pass không rõ container thì đọc lại điều kiện an toàn của mọi container', () => {
  const scope = planRealtimeRefresh([change(['gate-passes'], { visitId: 'visit-1' }), change(['gate', 'gate-passes'])]);
  assert.equal(scope?.safety, 'all');
});

test('thông báo hệ thống không kéo theo nhật ký kiểm toán', () => {
  const scope = planRealtimeRefresh([change(['notifications'], { source: 'system' })]);
  assert.deepEqual([...(scope?.keys ?? [])], ['notifications']);
  assert.deepEqual([...((scope?.safety as Set<string>) ?? [])], []);
});

test('nhóm lạ hoặc kết nối lại thì tải lại toàn bộ ở chế độ nền', () => {
  assert.deepEqual(
    { ...planRealtimeRefresh([change(['containers']), change(['future-topic'])]), keys: undefined },
    { full: true, keys: undefined, safety: 'all', partnerOptions: true, background: true },
  );
  assert.equal(planRealtimeRefresh([RESYNC_CHANGE])?.full, true);
  assert.equal(planRealtimeRefresh([]), null);
});

test('mọi khóa trong bảng ánh xạ đều là danh sách AppContext thật sự đọc', () => {
  const known = new Set<string>(DATA_KEYS);
  const scope = planRealtimeRefresh([change([
    'containers', 'gate', 'gate-passes', 'yard', 'movement-orders', 'billing', 'inspections', 'holds',
    'manifests', 'handovers', 'admin', 'edi', 'notifications',
  ])]);
  assert.ok(scope && !scope.full);
  for (const key of scope.keys) assert.ok(known.has(key), key);
});

test('gộp phạm vi: toàn bộ thắng, tập được hợp lại, chạy nền chỉ khi cả hai là nền', () => {
  const a = planRealtimeRefresh([change(['holds'], { visitId: 'v1' })])!;
  const b = planRealtimeRefresh([change(['billing'], { source: 'system' })])!;
  const merged = mergeRefreshScopes(a, b);
  assert.equal(merged.full, false);
  assert.ok(merged.keys.has('invoices') && merged.keys.has('containerVisits'));
  assert.deepEqual([...(merged.safety as Set<string>)], ['v1']);
  const foreground = mergeRefreshScopes(merged, { ...merged, background: false });
  assert.equal(foreground.background, false);
  const full = mergeRefreshScopes(merged, planRealtimeRefresh([RESYNC_CHANGE])!);
  assert.equal(full.full, true);
  assert.equal(full.safety, 'all');
});
