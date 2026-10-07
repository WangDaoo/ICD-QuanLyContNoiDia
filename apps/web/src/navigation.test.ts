import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeDestination, parseDestination } from './navigation';
test('destinations preserve distinct business entity ids and valid tab', () => {
  assert.equal(makeDestination('handovers', 'handover-1'), '/app/handovers?handoverId=handover-1');
  assert.equal(makeDestination('truck-visits', 'visit-1'), '/app/truck-visits?visitId=visit-1&action=create');
  assert.equal(makeDestination('gate-pass', undefined, { gatePassId: 'pass-1' }), '/app/gate-pass?gatePassId=pass-1');
  assert.deepEqual(parseDestination('/app/gate-pass', '?gatePassId=pass-1'), { tab: 'gate-pass', context: { gatePassId: 'pass-1' } });
  assert.equal(parseDestination('/app/unknown', '').tab, 'dashboard');
});
test('unsafe context and unrecognized query are not accepted', () => {
  assert.equal(parseDestination('/app/containers', '?visitId=' + 'a'.repeat(129) + '&jwt=secret').context.visitId, undefined);
  assert.equal(makeDestination('containers', 'visit?x=1'), '/app/containers?visitId=visit%3Fx%3D1');
});
