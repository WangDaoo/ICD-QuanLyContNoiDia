import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAllPages, type ListPageParams } from './load-list';

interface Row {
  id: string;
  status?: string;
}

test('canonical nested operation pages retain older active work after the first 100 rows', async () => {
  const newer = Array.from({ length: 100 }, (_, index) => ({ id: `newer-${index}`, status: 'COMPLETED' }));
  const older = { id: 'older-active-booking', status: 'IN_PROGRESS' };
  const requests: ListPageParams[] = [];

  const rows = await loadAllPages<Row>(async (params) => {
    requests.push(params);
    return {
      data: {
        items: params.page === 1 ? newer : [older],
        meta: { page: params.page, pageSize: 100, total: 101, totalPages: 2 },
      },
    };
  });

  assert.deepEqual(requests, [{ page: 1, pageSize: 100 }, { page: 2, pageSize: 100 }]);
  assert.deepEqual(rows, [...newer, older]);
});

test('nested metadata governs paging even when a page has fewer rows than pageSize', async () => {
  const requests: number[] = [];
  const rows = await loadAllPages<Row>(async ({ page }) => {
    requests.push(page);
    return { data: { items: [{ id: `page-${page}` }], meta: { totalPages: 2 } } };
  });

  assert.deepEqual(requests, [1, 2]);
  assert.deepEqual(rows, [{ id: 'page-1' }, { id: 'page-2' }]);
});

test('flat data and items envelopes preserve their pagination behavior', async () => {
  for (const listKey of ['data', 'items']) {
    const requests: number[] = [];
    const rows = await loadAllPages<Row>(async ({ page }) => {
      requests.push(page);
      return { [listKey]: [{ id: `page-${page}` }], meta: { totalPages: 2 } };
    });

    assert.deepEqual(requests, [1, 2]);
    assert.deepEqual(rows, [{ id: 'page-1' }, { id: 'page-2' }]);
  }
});

test('arrays and unpaged envelopes return their rows without an extra request', async () => {
  for (const response of [[{ id: 'single' }], { data: [{ id: 'single' }] }, { data: { items: [{ id: 'single' }] } }]) {
    let calls = 0;
    const rows = await loadAllPages<Row>(async () => {
      calls++;
      return response;
    });

    assert.equal(calls, 1);
    assert.deepEqual(rows, [{ id: 'single' }]);
  }
});

test('a failed later page rejects instead of returning a silently truncated collection', async () => {
  const error = new Error('Page 2 unavailable');
  await assert.rejects(loadAllPages<Row>(async ({ page }) => {
    if (page === 2) throw error;
    return { data: { items: [{ id: 'first-page' }], meta: { totalPages: 2 } } };
  }), (actual) => actual === error);
});
