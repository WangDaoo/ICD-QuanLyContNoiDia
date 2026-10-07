const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load, screenFixture, nodes, text } = require('./improvement-harness.cjs');

test('failed notification filter cannot display rows or pagination from the previous filter', async () => {
  let fail = false;
  const f = screenFixture('src/features/notifications/screens/NotificationsScreen.tsx', {
    '../../../services/api/api-client': { apiClient: { get: async () => {
      if (fail) throw new Error('Filter request failed');
      return { data: [{ id: 'gate-notice', type: 'GATE_OUT_COMPLETED', title: 'Gate notice', body: 'PREVIOUS_GATE_RESULT', createdAt: '2026-10-03T00:00:00Z' }], meta: { totalPages: 3, unreadCount: 1 } };
    } } },
  });
  f.render(); assert.match(text(await f.settle()), /PREVIOUS_GATE_RESULT/);
  fail = true;
  nodes(f.render(), node => node.type === 'TouchableOpacity')[1].props.onPress();
  f.render(); const failed = await f.settle();
  assert.match(text(failed), /Filter request failed/);
  assert.doesNotMatch(text(failed), /PREVIOUS_GATE_RESULT|Trang 1\/3/);
  assert.doesNotMatch(text(failed), /Không có thông báo phù hợp/);
});

test('booking detail presents the promised Vietnam schedule on a UTC device', async () => {
  const previousZone = process.env.TZ;
  process.env.TZ = 'UTC';
  try {
    const f = screenFixture('src/features/yard/screens/YardOperationDetailScreen.tsx', {
      '@react-navigation/native': { useNavigation: () => ({ goBack() {} }), useRoute: () => ({ params: { operationType: 'BOOKING', operationId: 'booking-1' } }) },
      '../api/yard.api': { yardApi: { getOperation: async () => ({ id: 'booking-1', status: 'COMPLETED', bookingType: 'STUFFING', scheduledAt: '2026-10-03T02:30:00.000Z' }) } },
    }, 'YardOperationDetailScreen');
    // Render the route-keyed detail component rather than mocking its formatting.
    const outer = f.render();
    const original = outer.type;
    assert.equal(typeof original, 'function');
    f.renderChild(original);
    const loaded = await f.settleChild(original);
    const schedule = nodes(loaded, node => node.type === 'DetailRow' && node.props.label === 'Lịch thực hiện')[0];
    assert.match(schedule.props.value, /09:30/);
    assert.match(schedule.props.value, /UTC\+7/);
  } finally {
    if (previousZone === undefined) delete process.env.TZ; else process.env.TZ = previousZone;
  }
});

test('late profile marker save cannot remove a newer session after logout and login', async () => {
  const memory = new Map(); let completeOldMarker;
  const storage = {
    getItem: async key => memory.get(key) || null,
    setItem: async (key, value) => {
      memory.set(key, value);
      if (key.startsWith('icd.mobile.active-profile.') && value.includes('user-A')) await new Promise(resolve => { completeOldMarker = resolve; });
    },
    removeItem: async key => { memory.delete(key); },
    getAllKeys: async () => [...memory.keys()],
    multiRemove: async keys => keys.forEach(key => memory.delete(key)),
  };
  const profiles = load('src/storage/read-cache-store.ts', { '@react-native-async-storage/async-storage': { __esModule: true, default: storage } });
  const user = id => ({ id, icdId: 'icd-test', roleCodes: [], permissionCodes: ['container.read'] });
  const oldSave = profiles.rememberProfile(user('user-A'));
  await new Promise(resolve => setImmediate(resolve));
  const logout = profiles.clearCachedSession(user('user-A'));
  const newSave = profiles.rememberProfile(user('user-B'));
  await new Promise(resolve => setImmediate(resolve));
  completeOldMarker();
  await Promise.all([oldSave, logout, newSave]);
  assert.equal((await profiles.restoreCachedProfile())?.id, 'user-B');
});

test('cache cleanup before restoring a new login is ordered even when the old current user is unavailable', async () => {
  const memory = new Map(); let completeRead, pauseRead = false;
  const storage = {
    getItem: async key => {
      const value = memory.get(key) || null;
      if (pauseRead && key.startsWith('icd.mobile.active-profile.')) {
        pauseRead = false;
        await new Promise(resolve => { completeRead = resolve; });
      }
      return value;
    },
    setItem: async (key, value) => { memory.set(key, value); },
    removeItem: async key => { memory.delete(key); },
    getAllKeys: async () => [...memory.keys()],
    multiRemove: async keys => keys.forEach(key => memory.delete(key)),
  };
  const profiles = load('src/storage/read-cache-store.ts', { '@react-native-async-storage/async-storage': { __esModule: true, default: storage } });
  const user = name => ({ id: 'same-user', name, icdId: 'icd-test', roleCodes: [], permissionCodes: ['container.read'] });
  await profiles.rememberProfile(user('Old session'));
  pauseRead = true;
  const logout = profiles.clearCachedSession(null);
  await new Promise(resolve => setImmediate(resolve));
  const newSave = profiles.rememberProfile(user('New session'));
  await new Promise(resolve => setImmediate(resolve));
  completeRead(); await Promise.all([logout, newSave]);
  assert.equal((await profiles.restoreCachedProfile())?.name, 'New session');
});

test('canonical notifications present Vietnamese business text without losing entity, deadline, amount, or reason', () => {
  const { presentNotification } = load('src/features/notifications/notification-presentation.ts');
  assert.equal(typeof presentNotification, 'function');
  const gate = presentNotification({ type: 'GATE_OUT_COMPLETED', title: 'Container MSCU6639870 Gate-Out Completed', body: 'Container MSCU6639870 has successfully gated out of ICD.' });
  assert.match(gate.title, /đã ra cổng.*MSCU6639870|MSCU6639870.*đã ra cổng/i);
  assert.match(gate.body, /MSCU6639870/); assert.doesNotMatch(gate.body, /successfully gated out/);
  const pass = presentNotification({ type: 'GATE_PASS_EXPIRING', title: 'Gate Pass Expiring Soon: GP-42', body: 'Gate Pass GP-42 for container MSCU6639870 will expire at 2026-10-03T02:30:00.000Z.' });
  assert.match(pass.title, /sắp hết hạn.*GP-42/i); assert.match(pass.body, /GP-42.*MSCU6639870/);
  assert.match(pass.body, /09:30/); assert.match(pass.body, /UTC\+7/);
  const storage = presentNotification({ type: 'FREE_STORAGE_EXPIRING', title: 'Free Storage Expiring Warning: MSCU6639870', body: 'Container MSCU6639870 has been in yard since 2026-10-01. Free storage period is nearing expiry.' });
  assert.match(storage.title, /miễn lưu bãi.*MSCU6639870/i); assert.match(storage.body, /2026-10-01/);
  const invoice = presentNotification({ type: 'INVOICE_EMAIL', title: 'ICD Invoice #INV-42', body: 'Dear Công ty A,\n\nPlease find attached your tax invoice #INV-42 for the amount of 1234.50 VND.\n\nThank you for choosing ICD services.' });
  assert.match(invoice.title, /Hóa đơn.*INV-42/); assert.match(invoice.body, /Công ty A/); assert.match(invoice.body, /INV-42.*1234.50 VND/);
  const hold = presentNotification({ type: 'INSPECTION_HOLD', title: 'Giám định HOLD: Container MSCU6639870', body: 'Container MSCU6639870 có kết quả giám định HOLD. Lý do: Seal lệch, check at bay7.' });
  assert.doesNotMatch(hold.title + hold.body, /HOLD/); assert.match(hold.body, /Lý do: Seal lệch, check at bay7\.$/);
});

test('notification localization leaves custom and unknown content intact and applies in list and detail', async () => {
  const { presentNotification } = load('src/features/notifications/notification-presentation.ts');
  assert.equal(typeof presentNotification, 'function');
  for (const row of [
    { type: 'GATE_OUT_COMPLETED', title: 'Custom customer title', body: 'Custom operational reason: HOLD / seal42.' },
    { type: 'FUTURE_TYPE', title: 'Container MSCU6639870 Gate-Out Completed', body: 'Unknown server content.' },
  ]) assert.deepEqual(presentNotification(row), { title: row.title, body: row.body });
  const f = screenFixture('src/features/notifications/screens/NotificationsScreen.tsx', {
    '../../../services/api/api-client': { apiClient: { get: async () => ({ data: [{ id: 'n1', type: 'GATE_OUT_COMPLETED', title: 'Container MSCU6639870 Gate-Out Completed', body: 'Container MSCU6639870 has successfully gated out of ICD.', createdAt: '2026-10-03T00:00:00Z' }], meta: { totalPages: 1, unreadCount: 1 } }) } },
  });
  f.render(); const list = await f.settle();
  assert.doesNotMatch(text(list), /Gate-Out Completed|successfully gated out/);
  nodes(list, n => n.type === 'PrimaryButton' && n.props.title === 'Xem chi tiết thông báo')[0].props.onPress();
  const dialog = nodes(f.render(), n => n.type === 'ActionDialog')[0];
  assert.doesNotMatch(text(dialog), /Gate-Out Completed|successfully gated out/);
  assert.match(text(dialog), /MSCU6639870/);
});

test('shared heading styles preserve font and weight with line-height no greater than1.3', () => {
  const { typography } = load('src/theme/typography.ts', { 'react-native': { Platform: { OS: 'android' } } });
  const ratio = style => { assert.ok(style.fontSize > 0 && style.lineHeight > 0); assert.ok(style.lineHeight / style.fontSize <= 1.3, JSON.stringify(style)); };
  const f = screenFixture('src/components/ScreenLayout.tsx', {
    './AppHeader': { AppHeader: 'AppHeader' }, './SessionCard': { SessionCard: 'SessionCard' }, './ConnectionBanner': { ConnectionBanner: 'ConnectionBanner' },
  }, 'Card');
  const heading = nodes(f.render({ title: 'Card heading' }), node => node.props.accessibilityRole === 'header')[0];
  assert.equal(heading.props.style.fontSize, 13); assert.equal(heading.props.style.fontWeight, '600'); ratio(heading.props.style);
  ratio(typography.h1); ratio(typography.h2); ratio(typography.h3);
  assert.equal(typography.h3.fontSize, 16); assert.equal(typography.h3.fontWeight, '600');
  for (const [file, headingText, size] of [
    ['src/components/AppHeader.tsx', 'Screen title', 13],
    ['src/components/SessionCard.tsx', 'PHIÊN ĐĂNG NHẬP CA TRỰC', 11],
  ]) {
    const fixture = screenFixture(file, { './ConnectionBanner': { ConnectionBanner: 'ConnectionBanner' } });
    const node = nodes(fixture.render({ title: 'Screen title' }), n => n.props.accessibilityRole === 'header' && text(n).includes(headingText))[0];
    assert.equal(node.props.style.fontSize, size); assert.equal(node.props.style.fontWeight, '600'); ratio(node.props.style);
  }
});

test('SessionCard presents known roles in Vietnamese and preserves an unknown role code with neutral context', () => {
  const f = screenFixture('src/components/SessionCard.tsx', {
    '../features/auth/hooks/useAuth': { useAuth: () => ({ user: { name: 'Fixture', roleCodes: ['ADMIN', 'YARD_STAFF', 'CUSTOM_PARTNER'] } }) },
  });
  const rendered = text(f.render());
  assert.match(rendered, /Quản trị viên/);
  assert.match(rendered, /Nhân viên bãi/);
  assert.doesNotMatch(rendered, /ADMIN|YARD_STAFF/);
  assert.match(rendered, /Chưa xác định \(CUSTOM_PARTNER\)/);
});
