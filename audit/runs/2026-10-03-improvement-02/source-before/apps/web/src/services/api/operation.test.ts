import assert from 'node:assert/strict';
import { executeOperation } from './operation';

let refreshed = 0;
const denied = await executeOperation(async () => { throw new Error('Vị trí đã có container'); }, async () => { refreshed++; });
assert.equal(denied.success, false);
assert.equal(denied.message, 'Vị trí đã có container');
assert.equal(refreshed, 0, 'Rejected writes must not refresh as successful commands');
let release!: (value: { id: string }) => void;
const pending = new Promise<{ id: string }>(resolve => { release = resolve; });
const command = executeOperation(() => pending, async () => { refreshed++; });
assert.equal(refreshed, 0, 'Do not claim success before API resolves');
release({ id: 'saved-on-server' });
const saved = await command;
assert.equal(saved.success, true);
assert.equal(saved.data?.id, 'saved-on-server');
assert.equal(refreshed, 1);
console.log('Backend command synchronization passed');
