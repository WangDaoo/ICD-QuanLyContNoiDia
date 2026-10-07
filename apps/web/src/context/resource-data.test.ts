import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFailureState, retainCollection } from './resource-data';
test('failed refresh retains data as stale, forbidden always drops it', () => {
  const old = [{ id: 'one' }];
  assert.equal(readFailureState({ status: 500 }, true), 'stale');
  assert.equal(readFailureState(new Error('offline'), false), 'error');
  assert.equal(readFailureState({ status: 403 }, true), 'forbidden');
  assert.deepEqual(retainCollection(old, [], 'stale'), old);
  assert.deepEqual(retainCollection(old, [], 'forbidden'), []);
  assert.deepEqual(retainCollection(old, [], 'ready'), []);
});
