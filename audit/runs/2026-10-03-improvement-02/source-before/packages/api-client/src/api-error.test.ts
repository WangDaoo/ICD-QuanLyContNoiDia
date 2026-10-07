import assert from 'node:assert/strict';
import test from 'node:test';
import { AxiosError, type AxiosAdapter } from 'axios';
import { ApiError, createApiClient } from './index';

async function rejectRequest(payload: unknown, status = 409): Promise<ApiError> {
  const client = createApiClient({ baseUrl: 'http://api.test/api' });
  const adapter: AxiosAdapter = async (config) => {
    throw new AxiosError(
      `Request failed with status code ${status}`,
      AxiosError.ERR_BAD_RESPONSE,
      config,
      undefined,
      { data: payload, status, statusText: 'Request rejected', headers: {}, config },
    );
  };
  client.raw.defaults.adapter = adapter;
  try {
    await client.post('/yard/blocks', { blockCode: 'A' });
  } catch (error) {
    assert.ok(error instanceof ApiError);
    return error;
  }
  assert.fail('Expected the rejected adapter request to produce ApiError');
}

test('canonical backend envelope exposes its Vietnamese business message and preserves the payload', async () => {
  const payload = {
    error: { code: 'YARD_BLOCK_CODE_IN_USE', message: 'Mã Yard Block đã tồn tại trong ICD.' },
    requestId: 'request-1',
  };
  const error = await rejectRequest(payload);

  assert.equal(error.message, payload.error.message);
  assert.equal(error.status, 409);
  assert.equal(error.payload, payload);
});

test('canonical validation envelope joins its message array', async () => {
  const error = await rejectRequest({ error: { code: 'VALIDATION_FAILED', message: ['Mã Block bắt buộc.', 'Tên Block quá dài.'] } }, 400);

  assert.equal(error.message, 'Mã Block bắt buộc., Tên Block quá dài.');
  assert.equal(error.status, 400);
});

test('canonical nested message takes priority over a legacy top-level message', async () => {
  const error = await rejectRequest({ error: { code: 'YARD_SLOT_OCCUPIED', message: 'Vị trí đang có container.' }, message: 'Legacy error message' });

  assert.equal(error.message, 'Vị trí đang có container.');
});

test('legacy flat string messages remain supported', async () => {
  const error = await rejectRequest({ statusCode: 400, message: 'Dữ liệu không hợp lệ.' }, 400);

  assert.equal(error.message, 'Dữ liệu không hợp lệ.');
});

test('legacy flat validation message arrays remain supported', async () => {
  const error = await rejectRequest({ message: ['First validation message', 'Second validation message'] }, 400);

  assert.equal(error.message, 'First validation message, Second validation message');
});

test('missing backend messages retain the Axios error fallback', async () => {
  const error = await rejectRequest({ error: { code: 'YARD_BLOCK_CODE_IN_USE' } });

  assert.equal(error.message, 'Request failed with status code 409');
});

test('network errors retain their message and status zero', async () => {
  const client = createApiClient({ baseUrl: 'http://api.test/api' });
  client.raw.defaults.adapter = async (config) => {
    throw new AxiosError('Network Error', AxiosError.ERR_NETWORK, config);
  };

  await assert.rejects(client.get('/yard/blocks'), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.message, 'Network Error');
    assert.equal(error.status, 0);
    assert.equal(error.payload, undefined);
    return true;
  });
});

test('non-Axios errors retain their original identity', async () => {
  const original = new Error('Adapter failed before receiving a response');
  const client = createApiClient({ baseUrl: 'http://api.test/api' });
  client.raw.defaults.adapter = async () => { throw original; };

  await assert.rejects(client.get('/yard/blocks'), (error: unknown) => error === original);
});
