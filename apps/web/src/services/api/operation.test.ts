import assert from 'node:assert/strict';
import { executeOperation } from './operation';
import { ApiError } from '@icd/api-client';
import test from 'node:test';

let refreshed = 0;
const denied = await executeOperation(
  async () => {
    throw new Error('Vị trí đã có container');
  },
  async () => {
    refreshed++;
  },
);
assert.equal(denied.success, false);
assert.equal(denied.message, 'Vị trí đã có container');
assert.equal(refreshed, 0, 'Rejected writes must not refresh as successful commands');
let release!: (value: { id: string }) => void;
const pending = new Promise<{ id: string }>((resolve) => {
  release = resolve;
});
const command = executeOperation(
  () => pending,
  async () => {
    refreshed++;
  },
);
assert.equal(refreshed, 0, 'Do not claim success before API resolves');
release({ id: 'saved-on-server' });
const saved = await command;
assert.equal(saved.success, true);
assert.equal(saved.data?.id, 'saved-on-server');
assert.equal(refreshed, 1);

test('a network write failure reports unknown server outcome without suggesting another write', async () => {
  let refreshCalls = 0;
  const result = await executeOperation(
    async () => {
      throw new ApiError('Network Error', 0);
    },
    async () => {
      refreshCalls++;
    },
  );
  assert.equal(result.success, false);
  assert.equal(result.outcome, 'unknown');
  assert.equal(
    result.message,
    'Chưa xác định kết quả trên server. Giữ bản nháp và kiểm tra trạng thái trước khi gửi lại.',
  );
  assert.equal(refreshCalls, 0);
});

test('a server rejection preserves its message and has a confirmed outcome', async () => {
  for (const status of [400, 409, 422]) {
    const result = await executeOperation(
      async () => {
        throw new ApiError('Rejected by server', status);
      },
      async () => {},
    );
    assert.equal(result.success, false);
    assert.equal(result.outcome, 'confirmed');
    assert.equal(result.message, 'Rejected by server');
  }
});
