import assert from 'node:assert/strict';
import test from 'node:test';
import { loadAllPages, type ListPageParams } from './load-list';

test('canonical nested operation pages retain older active work after the first 100 rows', async () => {
  const newer = Array.from({ length: 100 }, (_, index) => ({
    id: `newer-${index}`,
    status: 'COMPLETED',
  }));
  const older = { id: 'older-active-booking', status: 'IN_PROGRESS' };
  const requests: ListPageParams[] = [];

  const rows = await loadAllPages(async (params) => {
    requests.push(params);
    return {
      data: {
        items: params.page === 1 ? newer : [older],
        meta: { page: params.page, pageSize: 100, total: 101, totalPages: 2 },
      },
    };
  });

  assert.deepEqual(requests, [
    { page: 1, pageSize: 100 },
    { page: 2, pageSize: 100 },
  ]);
  assert.deepEqual(rows, [...newer, older]);
});

test('nested metadata governs paging even when a page has fewer rows than pageSize', async () => {
  const requests: number[] = [];
  const rows = await loadAllPages(async ({ page }) => {
    requests.push(page);
    return { data: { items: [{ id: `page-${page}` }], meta: { totalPages: 2 } } };
  });

  assert.deepEqual(requests, [1, 2]);
  assert.deepEqual(rows, [{ id: 'page-1' }, { id: 'page-2' }]);
});

test('flat data and items envelopes preserve their pagination behavior', async () => {
  for (const listKey of ['data', 'items']) {
    const requests: number[] = [];
    const rows = await loadAllPages(async ({ page }) => {
      requests.push(page);
      return { [listKey]: [{ id: `page-${page}` }], meta: { totalPages: 2 } };
    });

    assert.deepEqual(requests, [1, 2]);
    assert.deepEqual(rows, [{ id: 'page-1' }, { id: 'page-2' }]);
  }
});

test('arrays and unpaged envelopes return their rows without an extra request', async () => {
  for (const response of [
    [{ id: 'single' }],
    { data: [{ id: 'single' }] },
    { data: { items: [{ id: 'single' }] } },
  ]) {
    let calls = 0;
    const rows = await loadAllPages(async () => {
      calls++;
      return response;
    });

    assert.equal(calls, 1);
    assert.deepEqual(rows, [{ id: 'single' }]);
  }
});

test('a failed later page rejects instead of returning a silently truncated collection', async () => {
  const error = new Error('Page 2 unavailable');
  await assert.rejects(
    loadAllPages(async ({ page }) => {
      if (page === 2) throw error;
      return { data: { items: [{ id: 'first-page' }], meta: { totalPages: 2 } } };
    }),
    (actual) => actual === error,
  );
});

test('malformed pagination does not permit an unbounded or truncated successful load', async () => {
  await assert.rejects(
    loadAllPages(async () => ({ data: [{ id: 'row' }], meta: { totalPages: '2' } })),
    /Invalid pagination metadata/,
  );
});

test('malformed collection data is reported as unavailable rather than an empty success', async () => {
  await assert.rejects(
    loadAllPages(async () => ({ data: { items: {} } })),
    /Invalid list response/,
  );
});

test('present pagination metadata cannot omit the number of pages', async () => {
  for (const meta of [{}, { page: 1, pageSize: 1, total: 2 }, null, 'invalid']) {
    await assert.rejects(
      loadAllPages(async () => ({ data: [{ id: 'first' }], meta })),
      /Invalid pagination metadata/,
    );
  }
});

test('missing pagination on a later page cannot claim a completed collection', async () => {
  await assert.rejects(
    loadAllPages(async ({ page }) =>
      page === 1
        ? { data: [{ id: 'first' }], meta: { totalPages: 2 } }
        : { data: [{ id: 'second' }] },
    ),
    /Invalid pagination metadata/,
  );
});

test('pagination contradicting its page, total or final rows is unavailable', async () => {
  for (const meta of [
    { page: 2, totalPages: 1 },
    { totalPages: 0 },
    { pageSize: 1, total: 2, totalPages: 1 },
    { total: 2, totalPages: 1 },
    { total: '1', totalPages: 1 },
    { pageSize: 0, totalPages: 1 },
  ]) {
    await assert.rejects(
      loadAllPages(async () => ({ data: [{ id: 'first' }], meta })),
      /Invalid pagination metadata/,
    );
  }
});
