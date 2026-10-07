// Read-only review reproduction. All storage/API values below are in-memory fixtures.
const path = require('node:path');
const { load, screenFixture, nodes, text } = require(path.resolve(__dirname, '../../../../../apps/mobile/tests/improvement-harness.cjs'));
async function run() {
  let failFilter = false;
  const notifications = screenFixture('src/features/notifications/screens/NotificationsScreen.tsx', {
    '../../../services/api/api-client': { apiClient: { get: async () => {
      if (failFilter) throw new Error('filter request failed');
      return { data: [{ id: 'gate-notice', type: 'GATE_OUT_COMPLETED', title: 'Prior gate notification', body: 'PRIOR_GATE_ROW', createdAt: '2026-10-03T00:00:00Z' }], meta: { totalPages: 3, unreadCount: 1 } };
    } } },
  });
  notifications.render(); await notifications.settle(); failFilter = true;
  nodes(notifications.render(), node => node.type === 'TouchableOpacity')[1].props.onPress();
  notifications.render(); const failureTree = await notifications.settle();

  process.env.TZ = 'UTC';
  const instant = new Date('2026-10-03T02:30:00.000Z');
  const booking = screenFixture('src/features/yard/screens/YardOperationDetailScreen.tsx', {
    '@react-navigation/native': { useNavigation: () => ({ goBack() {} }), useRoute: () => ({ params: { operationType: 'BOOKING', operationId: 'booking-review' } }) },
    '../api/yard.api': { yardApi: { getOperation: async () => ({ status: 'COMPLETED', scheduledAt: instant.toISOString() }) } },
  });
  const detail = booking.render().type; booking.renderChild(detail);
  const bookingTree = await booking.settleChild(detail);
  const actualBookingDetail = nodes(bookingTree, n => n.type === 'DetailRow' && n.props.label === 'Lịch thực hiện')[0].props.value;
  const promisedVietnamDetail = instant.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) + ' (UTC+7)';

  process.env.EXPO_PUBLIC_API_BASE_URL = 'https://review.invalid/api';
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
  const user = id => ({ id, icdId: 'icd-review', sessionId: 's', name: 'Review fixture', email: 'fixture@example.invalid', roleCodes: [], permissionCodes: ['container.read'] });
  const oldSave = profiles.rememberProfile(user('user-A'));
  await new Promise(resolve => setImmediate(resolve));
  const clearing = profiles.clearCachedSession(user('user-A'));
  const savingNew = profiles.rememberProfile(user('user-B'));
  completeOldMarker(); await Promise.all([oldSave, clearing, savingNew]);
  const afterLateSave = (await profiles.restoreCachedProfile())?.id || null;
  process.stdout.write(JSON.stringify({
    notificationFailedFilter: { selectedFilter: 'INVOICE_EMAIL', priorWrongTypeRowStillShown: text(failureTree).includes('PRIOR_GATE_ROW'), priorPaginationStillShown: text(failureTree).includes('Trang 1/3'), unreadTotalCorrectlyUnknown: !text(failureTree).includes('Chưa đọc: 1') },
    bookingDetailOnUTCDevice: { instant: instant.toISOString(), actualBookingDetail, promisedVietnamDetail, mismatch: actualBookingDetail !== promisedVietnamDetail },
    delayedProfileSave: { afterLateSave, newerProfileMarkerLost: afterLateSave !== 'user-B' },
    interpretation: 'IN_MEMORY_SOURCE_REPRODUCTION_NOT_NATIVE_RUNTIME_OR_PRODUCTION_API',
  }, null, 2) + '\n');
}
run().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
