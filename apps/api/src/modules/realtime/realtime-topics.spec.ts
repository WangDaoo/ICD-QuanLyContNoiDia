import { normalizeRealtimePath, resolveRealtimeChange } from './realtime-topics';

describe('normalizeRealtimePath', () => {
  it.each([
    ['/api/containers/abc/gate-in', 'containers/abc/gate-in'],
    ['/api/containers?status=IN_YARD', 'containers'],
    ['api/gate-out/', 'gate-out'],
    ['/containers', 'containers'],
    ['/api', ''],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeRealtimePath(input)).toBe(expected);
  });
});

describe('resolveRealtimeChange', () => {
  it.each(['GET', 'HEAD', 'OPTIONS', 'get'])('ignores read-only %s requests', (method) => {
    expect(resolveRealtimeChange(method, '/api/containers')).toBeNull();
  });

  it.each([
    '/api/auth/login',
    '/api/auth/refresh',
    '/api/auth/logout',
    '/api/service-orders/preview',
    '/api/gate-pass/scan',
    '/api/containers/visit-1/yard/check',
    '/api/notifications/register-device',
    '/api/notifications/unregister-device',
  ])('does not publish for %s', (path) => {
    expect(resolveRealtimeChange('POST', path)).toBeNull();
  });

  it('scopes notification read receipts to the acting user', () => {
    expect(resolveRealtimeChange('PATCH', '/api/notifications/n-1/read')).toEqual({
      topics: ['notifications'],
      audience: 'user',
    });
    expect(resolveRealtimeChange('POST', '/api/notifications/read-all')).toEqual({
      topics: ['notifications'],
      audience: 'user',
    });
  });

  it.each<[string, string, string[]]>([
    ['POST', '/api/containers', ['containers']],
    ['PATCH', '/api/containers/visit-1', ['containers']],
    ['POST', '/api/containers/visit-1/gate-in', ['containers', 'gate']],
    ['POST', '/api/containers/visit-1/gate-pass', ['containers', 'gate', 'gate-passes']],
    ['POST', '/api/containers/visit-1/cancel', ['containers', 'gate']],
    ['POST', '/api/containers/visit-1/holds', ['containers', 'holds']],
    ['POST', '/api/containers/visit-1/holds/h-1/release', ['containers', 'holds']],
    ['POST', '/api/containers/visit-1/yard/assign', ['containers', 'yard']],
    ['POST', '/api/containers/visit-1/yard/movements', ['containers', 'yard']],
    ['POST', '/api/containers/visit-1/yard-bookings', ['containers', 'yard']],
    ['POST', '/api/containers/visit-1/movement-orders', ['containers', 'movement-orders']],
    ['POST', '/api/containers/visit-1/service-orders', ['containers', 'billing']],
    ['POST', '/api/containers/visit-1/inspections', ['containers', 'inspections']],
    ['POST', '/api/gate/truck-visits/t-1/arrive', ['gate', 'containers']],
    ['POST', '/api/gate-out', ['gate', 'gate-passes', 'containers']],
    ['POST', '/api/gate-passes/gp-1/cancel', ['gate', 'gate-passes', 'containers']],
    ['POST', '/api/yard/movements/m-1/complete', ['yard', 'containers']],
    ['PATCH', '/api/yard/slots/s-1', ['yard', 'containers']],
    ['POST', '/api/movement-orders/o-1/authorize', ['movement-orders', 'containers']],
    ['POST', '/api/service-orders/so-1/confirm', ['billing', 'containers']],
    ['POST', '/api/invoices/i-1/payments', ['billing', 'containers']],
    ['POST', '/api/inspections/i-1/complete', ['inspections', 'containers']],
    ['POST', '/api/manifests/m-1/submit', ['manifests', 'containers']],
    ['DELETE', '/api/manifests/m-1/master-bls/b-1', ['manifests', 'containers']],
    ['POST', '/api/handovers/h-1/publish', ['handovers']],
    ['PATCH', '/api/customer-warehouses/w-1', ['handovers']],
    ['POST', '/api/v1/external/handovers/h-1/accept', ['handovers']],
    ['POST', '/api/admin/tariffs/t-1/activate', ['billing', 'admin']],
    ['POST', '/api/admin/partner-clients/p-1/rotate', ['handovers', 'admin']],
    ['PUT', '/api/admin/roles/r-1/permissions', ['admin']],
    ['PATCH', '/api/admin/master-data/consignees/c-1', ['admin']],
    ['POST', '/api/integrations/edi/dispatch', ['edi']],
    ['POST', '/api/something-new', ['other']],
  ])('maps %s %s to its data groups', (method, path, topics) => {
    expect(resolveRealtimeChange(method, path)).toMatchObject({ topics, audience: 'icd' });
  });

  it('names the container visit for /containers/:visitId writes', () => {
    expect(resolveRealtimeChange('POST', '/api/containers/visit-1/holds/h-1/release')).toEqual({
      topics: ['containers', 'holds'],
      audience: 'icd',
      visitId: 'visit-1',
    });
    expect(resolveRealtimeChange('PATCH', '/api/containers/visit-2')).toEqual({
      topics: ['containers'],
      audience: 'icd',
      visitId: 'visit-2',
    });
    expect(resolveRealtimeChange('POST', '/api/containers')).toEqual({ topics: ['containers'], audience: 'icd' });
    expect(resolveRealtimeChange('POST', '/api/gate-out')).not.toHaveProperty('visitId');
  });

  it('ignores query strings and the trailing slash', () => {
    expect(resolveRealtimeChange('POST', '/api/gate-out/?dryRun=false')).toEqual({
      topics: ['gate', 'gate-passes', 'containers'],
      audience: 'icd',
    });
  });
});
